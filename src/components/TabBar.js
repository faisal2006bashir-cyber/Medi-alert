import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { softShadow, useColors } from '../theme';

/** The bottom navigation bar with a raised button in the middle for adding a medicine. */
export default function TabBar({ tab, onTab, onAdd }) {
  const c = useColors();

  const item = (name, label, icon, iconActive) => {
    const active = tab === name;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        onPress={() => onTab(name)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 56 }}
      >
        <Ionicons name={active ? iconActive : icon} size={24} color={active ? c.brand : c.muted} />
        <Text style={{ color: active ? c.brand : c.muted, fontSize: 12, fontWeight: active ? '700' : '500', marginTop: 2 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: 12, paddingVertical: 6 }}>
      {item('today', 'Today', 'today-outline', 'today')}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a medicine"
        onPress={onAdd}
        style={({ pressed }) => [
          { width: 58, height: 58, borderRadius: 29, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, opacity: pressed ? 0.85 : 1 },
          softShadow
        ]}
      >
        <Ionicons name="add" size={32} color={c.brandInk} />
      </Pressable>
      {item('medicines', 'Medicines', 'medkit-outline', 'medkit')}
    </View>
  );
}
