import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Stepper } from '../components/ui';
import TimeField from '../components/TimeField';
import { radius, useColors } from '../theme';
import { toDateString } from '../logic';

const digits = (text) => text.replace(/[^0-9]/g, '');

/** A form for adding a new medicine. Calls onSave with the finished record. */
export default function AddMedicineScreen({ visible, onClose, onSave }) {
  const c = useColors();
  const [name, setName] = useState('');
  const [dose, setDose] = useState(1);
  const [stock, setStock] = useState('30');
  const [days, setDays] = useState('7');
  const [lead, setLead] = useState(5);
  const [times, setTimes] = useState(['08:00']);
  const [error, setError] = useState('');

  const inputStyle = {
    borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 14, minHeight: 48,
    backgroundColor: c.bg, color: c.ink, fontSize: 16
  };
  const label = { color: c.muted, marginBottom: 6 };

  const uniqueTimes = [...new Set(times)].sort();
  const stockCount = Math.max(0, parseInt(stock, 10) || 0);
  const courseDays = Math.max(0, parseInt(days, 10) || 0);
  const pillsPerDay = uniqueTimes.length * dose;
  const needed = courseDays * pillsPerDay;

  let preview = `${pillsPerDay} pill${pillsPerDay === 1 ? '' : 's'} a day. Your stock lasts ${Math.floor(stockCount / pillsPerDay)} days.`;
  if (courseDays > 0) {
    preview = stockCount >= needed
      ? `The ${courseDays}-day course needs ${needed} pills. Your stock covers it.`
      : `The ${courseDays}-day course needs ${needed} pills. You will need ${needed - stockCount} more.`;
  }

  const updateTime = (index, value) => setTimes(times.map((t, i) => (i === index ? value : t)));

  const reset = () => {
    setName(''); setDose(1); setStock('30'); setDays('7'); setLead(5); setTimes(['08:00']); setError('');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Enter the name of the medicine.');
      return;
    }
    const now = new Date();
    onSave({
      id: Date.now(),
      name: name.trim(),
      dose,
      stock: stockCount,
      initial: stockCount,
      days: courseDays,
      lead,
      start: toDateString(now),
      createdAt: now.getTime(),
      times: uniqueTimes,
      log: {},
      snooze: {}
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
            <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 26, fontWeight: '800' }}>Add a medicine</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color={c.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Card>
              <Text style={label}>Medicine name</Text>
              <TextInput
                style={[inputStyle, error ? { borderColor: c.alert } : null]}
                value={name}
                onChangeText={(text) => { setName(text); setError(''); }}
                placeholder="For example, Amoxicillin 500 mg"
                placeholderTextColor={c.muted}
                accessibilityLabel="Medicine name"
              />
              {error ? <Text style={{ color: c.alert, marginTop: 6 }}>{error}</Text> : null}
              <View style={{ height: 16 }} />
              <Stepper label="Pills per dose" value={dose} onChange={setDose} min={1} max={10} />
            </Card>

            <Card>
              <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Alarm times</Text>
              {times.map((time, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TimeField value={time} onChange={(value) => updateTime(index, value)} />
                  {times.length > 1 ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove time ${index + 1}`} onPress={() => setTimes(times.filter((_, i) => i !== index))} hitSlop={10} style={{ marginLeft: 12 }}>
                      <Ionicons name="close-circle" size={26} color={c.muted} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Button label="Add another time" icon="add" onPress={() => setTimes([...times, '20:00'])} style={{ alignSelf: 'flex-start' }} />
            </Card>

            <Card>
              <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Course and supply</Text>
              <Text style={label}>Pills in stock</Text>
              <TextInput style={inputStyle} value={stock} onChangeText={(t) => setStock(digits(t))} keyboardType="number-pad" accessibilityLabel="Pills in stock" />
              <View style={{ height: 16 }} />
              <Text style={label}>Course length in days</Text>
              <TextInput style={inputStyle} value={days} onChangeText={(t) => setDays(digits(t))} keyboardType="number-pad" accessibilityLabel="Course length in days" />
              <Text style={{ color: c.muted, fontSize: 12, marginTop: 4, marginBottom: 16 }}>Enter 0 if there is no end date.</Text>
              <Stepper label="Warn me when supply drops to" value={lead} onChange={setLead} min={1} max={30} format={(v) => `${v} day${v === 1 ? '' : 's'}`} />
              <View style={{ flexDirection: 'row', backgroundColor: c.brandSoft, borderRadius: radius.sm, padding: 12 }}>
                <Ionicons name="information-circle-outline" size={20} color={c.brand} style={{ marginRight: 8 }} />
                <Text style={{ color: c.ink, flex: 1 }}>{preview}</Text>
              </View>
            </Card>

            <Button large variant="primary" label="Save medicine" icon="checkmark" onPress={handleSave} />
            <Button label="Cancel" variant="quiet" onPress={onClose} style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
