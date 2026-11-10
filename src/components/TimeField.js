import React, { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { radius, useColors } from '../theme';
import { dateToTime, formatTime, timeToDate } from '../logic';

/** Lets the user pick a time of day. Uses an inline picker on iOS and a dialog on Android. */
export default function TimeField({ value, onChange }) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  const handleChange = (event, date) => {
    setOpen(false);
    if (event.type !== 'dismissed' && date) {
      onChange(dateToTime(date));
    }
  };

  if (Platform.OS === 'ios') {
    return <DateTimePicker mode="time" display="compact" value={timeToDate(value)} onChange={handleChange} />;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dose time ${formatTime(value)}. Tap to change.`}
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: 14, backgroundColor: c.bg }}
      >
        <Ionicons name="time-outline" size={18} color={c.muted} style={{ marginRight: 8 }} />
        <Text style={{ color: c.ink, fontSize: 16, fontWeight: '600' }}>{formatTime(value)}</Text>
      </Pressable>
      {open && <DateTimePicker mode="time" value={timeToDate(value)} onChange={handleChange} />}
    </>
  );
}
