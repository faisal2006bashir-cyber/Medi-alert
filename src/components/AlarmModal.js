import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { useColors } from '../theme';
import { formatTime, ringId, SNOOZE_MINUTES } from '../logic';

/**
 * A full screen alarm that appears when a dose is due while the app is open.
 * It vibrates until the person takes the dose, snoozes it, or stops the alarm.
 */
export default function AlarmModal({ dose, moreCount, onTake, onSnooze, onSilence }) {
  const c = useColors();
  const pulse = useRef(new Animated.Value(0)).current;
  const id = dose ? ringId(dose) : null;

  useEffect(() => {
    if (!id) {
      return undefined;
    }
    Vibration.vibrate(700);
    const buzz = setInterval(() => Vibration.vibrate(700), 1600);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => {
      clearInterval(buzz);
      loop.stop();
      Vibration.cancel();
    };
  }, [id, pulse]);

  if (!dose) {
    return null;
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const pills = `${dose.medicine.dose} pill${dose.medicine.dose === 1 ? '' : 's'}`;

  return (
    <Modal visible animationType="fade" onRequestClose={onSilence}>
      <SafeAreaView accessibilityViewIsModal style={{ flex: 1, backgroundColor: c.brand, padding: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
            <Ionicons name="alarm" size={68} color={c.brandInk} />
          </Animated.View>
          <Text style={{ color: c.brandInk, fontSize: 56, fontWeight: '800', marginTop: 28 }}>{formatTime(dose.time)}</Text>
          <Text style={{ color: c.brandInk, fontSize: 16, opacity: 0.85, marginTop: 4 }}>Time to take your medicine</Text>
          <Text style={{ color: c.brandInk, fontSize: 28, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>{dose.medicine.name}</Text>
          <Text style={{ color: c.brandInk, fontSize: 18, opacity: 0.9, marginTop: 4 }}>{pills}</Text>
          {moreCount > 0 ? (
            <Text style={{ color: c.brandInk, marginTop: 16, fontWeight: '600' }}>{moreCount} more due after this one</Text>
          ) : null}
        </View>

        <View>
          <Button large label="I took it" icon="checkmark-circle" color={c.brand} onPress={onTake} style={{ backgroundColor: c.brandInk, borderWidth: 0, marginBottom: 12 }} />
          <Button large label={`Snooze ${SNOOZE_MINUTES} min`} icon="time-outline" color={c.brandInk} onPress={onSnooze} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 0, marginBottom: 8 }} />
          <Button label="Stop alarm" variant="quiet" color={c.brandInk} onPress={onSilence} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
