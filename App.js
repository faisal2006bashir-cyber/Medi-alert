import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadMedicines, saveMedicines } from './src/storage';
import { ACTION_SNOOZE, ACTION_TAKEN, rescheduleReminders, setupNotifications } from './src/notifications';
import { radius, useColors } from './src/theme';
import { Banner, Button } from './src/components/ui';
import TabBar from './src/components/TabBar';
import AlarmModal from './src/components/AlarmModal';
import TodayScreen from './src/screens/TodayScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import AddMedicineScreen from './src/screens/AddMedicineScreen';
import {
  doseKey, getRingingDoses, isTaken, listTodayDoses, nextRingMs, ringId, SNOOZE_MINUTES, toDateString
} from './src/logic';

// Notifications do not run in a browser, so on web we skip them and use a do-nothing
// stand-in for the notifications hook (the real one throws an error on web).
const IS_WEB = Platform.OS === 'web';
const useLastNotificationResponse =
  IS_WEB ? () => null : Notifications.useLastNotificationResponse;

const TICK_MS = 15 * 1000;
const PRECISE_TIMER_WINDOW_MS = 20 * 1000;
const SNOOZE_KEEP_MS = 2 * 24 * 60 * 60 * 1000;

const greeting = (date) => {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const without = (object, key) => {
  const copy = { ...(object || {}) };
  delete copy[key];
  return copy;
};

/** Root component. Owns the data, keeps the saved reminders in step with it, and rings the in-app alarm. */
function Main() {
  const c = useColors();
  const [medicines, setMedicines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [tab, setTab] = useState('today');
  const [adding, setAdding] = useState(false);
  const [refillTarget, setRefillTarget] = useState(null);
  const [refillAmount, setRefillAmount] = useState('30');
  const [now, setNow] = useState(new Date());
  const [silenced, setSilenced] = useState(() => new Set());
  const medicinesRef = useRef([]);
  const loadedRef = useRef(false);
  const handledResponse = useRef(null);
  const lastResponse = useLastNotificationResponse();

  medicinesRef.current = medicines;
  loadedRef.current = loaded;

  // Load saved data and request notification permission once at startup.
  useEffect(() => {
    if (!IS_WEB) {
      setupNotifications().then(setNotificationsOn);
    }
    loadMedicines().then((saved) => {
      setMedicines(saved);
      setLoaded(true);
    });
  }, []);

  // Save and reschedule reminders every time the data changes.
  useEffect(() => {
    if (loaded) {
      saveMedicines(medicines);
      if (!IS_WEB) {
        rescheduleReminders(medicines);
      }
    }
  }, [medicines, loaded]);

  // Refresh the clock so due doses appear without any user action.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // When the app returns to the foreground, refresh the clock and top up the reminders.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
        if (loadedRef.current && !IS_WEB) {
          rescheduleReminders(medicinesRef.current);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const doses = useMemo(() => listTodayDoses(medicines, now), [medicines, now]);

  // Ring exactly on time: when the next dose is less than 20 seconds away, set a precise timer.
  useEffect(() => {
    const next = nextRingMs(doses, Date.now());
    if (next === null || next - Date.now() > PRECISE_TIMER_WINDOW_MS) {
      return undefined;
    }
    const timer = setTimeout(() => setNow(new Date()), Math.max(0, next - Date.now()) + 250);
    return () => clearTimeout(timer);
  }, [doses]);

  const update = useCallback((id, change) => {
    setMedicines((list) => list.map((item) => (item.id === id ? change(item) : item)));
  }, []);

  const takeDose = useCallback((id, time, day = toDateString(new Date())) => update(id, (m) => {
    if (isTaken(m, day, time)) {
      return m;
    }
    return {
      ...m,
      stock: Math.max(0, m.stock - m.dose),
      snooze: without(m.snooze, doseKey(day, time)),
      log: { ...m.log, [day]: [...(m.log[day] || []), time] }
    };
  }), [update]);

  const undoDose = useCallback((id, time, day = toDateString(new Date())) => update(id, (m) => {
    if (!isTaken(m, day, time)) {
      return m;
    }
    return { ...m, stock: m.stock + m.dose, log: { ...m.log, [day]: (m.log[day] || []).filter((t) => t !== time) } };
  }), [update]);

  const snoozeDose = useCallback((id, time, day = toDateString(new Date())) => update(id, (m) => {
    if (isTaken(m, day, time)) {
      return m;
    }
    const kept = {};
    Object.keys(m.snooze || {}).forEach((key) => {
      if (m.snooze[key] > Date.now() - SNOOZE_KEEP_MS) {
        kept[key] = m.snooze[key];
      }
    });
    kept[doseKey(day, time)] = Date.now() + SNOOZE_MINUTES * 60 * 1000;
    return { ...m, snooze: kept };
  }), [update]);

  // React to the buttons on a reminder: "I took it", "Snooze", or a plain tap.
  useEffect(() => {
    if (!loaded || !lastResponse) {
      return;
    }
    const request = lastResponse.notification.request;
    const handleId = `${request.identifier}:${lastResponse.actionIdentifier}`;
    if (handledResponse.current === handleId) {
      return;
    }
    handledResponse.current = handleId;
    const data = request.content.data || {};
    if (!data.medicineId || !data.time) {
      return;
    }
    if (lastResponse.actionIdentifier === ACTION_TAKEN) {
      takeDose(data.medicineId, data.time, data.day);
    } else if (lastResponse.actionIdentifier === ACTION_SNOOZE) {
      snoozeDose(data.medicineId, data.time, data.day);
    }
    setTab('today');
  }, [lastResponse, loaded, takeDose, snoozeDose]);

  const confirmRefill = () => {
    const amount = parseInt(refillAmount, 10);
    if (refillTarget && amount > 0) {
      update(refillTarget.id, (m) => ({ ...m, stock: m.stock + amount, initial: Math.max(m.initial, m.stock + amount) }));
    }
    setRefillTarget(null);
  };

  // The in-app alarm waits while a form is open, because two full screen windows cannot show at once.
  const ringing = getRingingDoses(doses, now.getTime(), silenced);
  const alarm = loaded && !adding && refillTarget === null ? ringing[0] : null;
  const silence = (dose) => setSilenced((set) => new Set(set).add(ringId(dose)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="auto" />

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ color: c.muted }}>
          {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 30, fontWeight: '800' }}>
          {tab === 'today' ? greeting(now) : 'My medicines'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        {!notificationsOn ? (
          <Banner tone="refill" text="Notifications are off, so alarms cannot ring while the app is closed. Turn them on in your phone settings." />
        ) : null}
        {tab === 'today'
          ? <TodayScreen medicines={medicines} now={now} onTake={takeDose} onUndo={undoDose} onSnooze={snoozeDose} />
          : <MedicinesScreen medicines={medicines} now={now} onDelete={(id) => setMedicines((l) => l.filter((m) => m.id !== id))} onRefill={(m) => { setRefillAmount('30'); setRefillTarget(m); }} />}
      </ScrollView>

      <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding(true)} />

      <AddMedicineScreen
        visible={adding}
        onClose={() => setAdding(false)}
        onSave={(medicine) => { setMedicines((list) => [...list, medicine]); setAdding(false); setTab('today'); }}
      />

      <Modal visible={refillTarget !== null} transparent animationType="fade" onRequestClose={() => setRefillTarget(null)}>
        <View style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: 20 }}>
            <Text style={{ color: c.ink, fontWeight: '800', fontSize: 18, marginBottom: 4 }}>
              Add pills to {refillTarget ? refillTarget.name : ''}
            </Text>
            <Text style={{ color: c.muted, marginBottom: 12 }}>How many pills did you buy?</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: c.ink, backgroundColor: c.bg, marginBottom: 16 }}
              value={refillAmount}
              onChangeText={(text) => setRefillAmount(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              accessibilityLabel="Number of pills to add"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button label="Cancel" variant="quiet" onPress={() => setRefillTarget(null)} />
              <Button label="Add to stock" variant="primary" onPress={confirmRefill} style={{ marginLeft: 8 }} />
            </View>
          </View>
        </View>
      </Modal>

      <AlarmModal
        dose={alarm}
        moreCount={Math.max(0, ringing.length - 1)}
        onTake={() => alarm && takeDose(alarm.medicine.id, alarm.time, alarm.day)}
        onSnooze={() => alarm && snoozeDose(alarm.medicine.id, alarm.time, alarm.day)}
        onSilence={() => alarm && silence(alarm)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
