import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, softShadow, useColors } from '../theme';

/** A rounded surface that groups related content. Tone is alert or undefined. */
export function Card({ children, tone, style }) {
  const c = useColors();
  const border = tone === 'alert' ? c.alert : c.line;
  const background = tone === 'alert' ? c.alertBg : c.surface;
  return (
    <View style={[{ backgroundColor: background, borderColor: border, borderWidth: 1, borderRadius: radius.md, padding: 16, marginBottom: 12 }, softShadow, style]}>
      {children}
    </View>
  );
}

/** A tappable button. Variants are primary, secondary, quiet, and danger. The color prop overrides the text color. */
export function Button({ label, onPress, variant = 'secondary', icon, style, large, color: textColor }) {
  const c = useColors();
  const primary = variant === 'primary';
  const quiet = variant === 'quiet';
  const danger = variant === 'danger';
  const color = textColor || (primary ? c.brandInk : danger ? c.alert : quiet ? c.muted : c.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          minHeight: large ? 56 : 44, paddingHorizontal: large ? 24 : 16, borderRadius: radius.md,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: primary ? c.brand : quiet ? 'transparent' : c.surface,
          borderWidth: primary || quiet ? 0 : 1, borderColor: danger ? c.alert : c.line,
          opacity: pressed ? 0.75 : 1
        },
        style
      ]}
    >
      {icon ? <Ionicons name={icon} size={large ? 22 : 18} color={color} style={{ marginRight: 8 }} /> : null}
      <Text style={{ color, fontWeight: primary ? '700' : '600', fontSize: large ? 17 : 15 }}>{label}</Text>
    </Pressable>
  );
}

/** A small status label. Tone is ok or warn. */
export function Badge({ label, tone = 'ok', icon }) {
  const c = useColors();
  const warn = tone === 'warn';
  const color = warn ? c.warn : c.brand;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: warn ? c.warnBg : c.okBg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, marginRight: 6, marginTop: 6 }}>
      {icon ? <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

/** A full width message shown above the lists. Tone is alert or refill. */
export function Banner({ text, tone = 'alert' }) {
  const c = useColors();
  const refill = tone === 'refill';
  const color = refill ? c.warn : c.alert;
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: refill ? c.warnBg : c.alertBg, borderColor: color, borderWidth: 1, borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
      <Ionicons name={refill ? 'basket-outline' : 'alarm-outline'} size={22} color={color} style={{ marginRight: 10 }} />
      <Text style={{ color, fontWeight: '600', flex: 1 }}>{text}</Text>
    </View>
  );
}

/** A thin bar showing progress. Value runs from 0 to 1. */
export function ProgressBar({ value, tone, height = 8 }) {
  const c = useColors();
  const percent = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.line, overflow: 'hidden' }}>
      <View style={{ width: `${percent}%`, height: '100%', borderRadius: height / 2, backgroundColor: tone === 'warn' ? c.warn : c.brand }} />
    </View>
  );
}

/** A heading for a group of cards, with an optional count. */
export function SectionTitle({ children, count }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10 }}>
      <Text accessibilityRole="header" style={{ color: c.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>{children}</Text>
      {count !== undefined ? <Text style={{ color: c.muted, fontSize: 13, marginLeft: 8 }}>{count}</Text> : null}
    </View>
  );
}

/** A friendly message for an empty list. */
export function EmptyState({ icon, title, text }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Ionicons name={icon} size={34} color={c.brand} />
      </View>
      <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: c.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

/** A minus and plus control for a small whole number. */
export function Stepper({ label, value, onChange, min = 1, max = 20, format, hint }) {
  const c = useColors();
  const round = (name, disabled, delta) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      disabled={disabled}
      onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt, opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={delta < 0 ? 'remove' : 'add'} size={22} color={c.ink} />
    </Pressable>
  );
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: c.muted, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {round('Decrease', value <= min, -1)}
        <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700', minWidth: 90, textAlign: 'center' }}>{format ? format(value) : value}</Text>
        {round('Increase', value >= max, 1)}
      </View>
      {hint ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}
