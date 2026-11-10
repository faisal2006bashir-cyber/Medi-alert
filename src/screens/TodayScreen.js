import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Banner, Button, Card, EmptyState, ProgressBar, SectionTitle } from '../components/ui';
import { useColors } from '../theme';
import { dateToTime, formatCountdown, formatTime, getStatus, listTodayDoses, toDateString } from '../logic';

const pillText = (count) => `${count} pill${count === 1 ? '' : 's'}`;

/** One dose with its status and the buttons that fit its state. */
function DoseCard({ dose, onTake, onUndo, onSnooze }) {
  const c = useColors();
  const { medicine, time, taken, due, snoozed } = dose;
  const icon = taken ? 'checkmark' : due ? 'alarm' : 'time-outline';
  const iconColor = taken ? c.brand : due ? c.alert : c.muted;

  return (
    <Card tone={due ? 'alert' : undefined} style={taken ? { opacity: 0.7 } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: taken ? c.okBg : c.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{formatTime(time)}</Text>
          <Text style={{ color: c.ink, fontWeight: '600' }}>{medicine.name}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>{pillText(medicine.dose)}</Text>
        </View>
        {taken ? <Button label="Undo" variant="quiet" onPress={() => onUndo(medicine.id, time)} /> : null}
      </View>

      {snoozed ? (
        <View style={{ flexDirection: 'row' }}>
          <Badge tone="warn" icon="notifications-off-outline" label={`Snoozed until ${formatTime(dateToTime(new Date(dose.ringFrom)))}`} />
        </View>
      ) : null}

      {!taken ? (
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Button label="Taken" icon="checkmark" variant={due ? 'primary' : 'secondary'} onPress={() => onTake(medicine.id, time)} style={{ flex: 1 }} />
          {due ? <Button label="Snooze" icon="time-outline" onPress={() => onSnooze(medicine.id, time)} style={{ marginLeft: 8 }} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Shows today's progress, the next dose, and the doses grouped by what needs attention. */
export default function TodayScreen({ medicines, now, onTake, onUndo, onSnooze }) {
  const c = useColors();
  const today = toDateString(now);
  const nowMs = now.getTime();
  const doses = listTodayDoses(medicines, now);

  const due = doses.filter((d) => d.due);
  const upcoming = doses.filter((d) => !d.taken && !d.due);
  const done = doses.filter((d) => d.taken);
  const next = upcoming.slice().sort((a, b) => a.ringFrom - b.ringFrom)[0];

  const refills = medicines.filter((medicine) => {
    const status = getStatus(medicine, today);
    return status.started && !status.finished && status.needsRefill;
  });

  if (medicines.length === 0) {
    return <EmptyState icon="medkit-outline" title="No medicines yet" text="Tap the + button to add your first medicine and set its alarm times." />;
  }

  const summary = doses.length === 0
    ? 'No doses are scheduled for today.'
    : due.length > 0
      ? `${due.length} dose${due.length === 1 ? '' : 's'} need${due.length === 1 ? 's' : ''} your attention.`
      : next
        ? `Next: ${next.medicine.name} at ${formatTime(next.time)} (${formatCountdown(next.ringFrom - nowMs)}).`
        : 'All done for today. Nice work.';

  return (
    <View>
      {refills.map((medicine) => (
        <Banner key={`refill-${medicine.id}`} tone="refill" text={`Plan a refill. ${medicine.name} is running low.`} />
      ))}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
          <Text style={{ color: c.ink, fontSize: 32, fontWeight: '800' }}>{done.length}</Text>
          <Text style={{ color: c.muted, fontSize: 16, marginLeft: 6 }}>of {doses.length} doses taken</Text>
        </View>
        <ProgressBar value={doses.length ? done.length / doses.length : 0} />
        <Text style={{ color: c.muted, marginTop: 10 }}>{summary}</Text>
      </Card>

      {due.length > 0 ? <SectionTitle count={due.length}>Needs attention</SectionTitle> : null}
      {due.map((d) => <DoseCard key={d.medicine.id + d.key} dose={d} onTake={onTake} onUndo={onUndo} onSnooze={onSnooze} />)}

      {upcoming.length > 0 ? <SectionTitle count={upcoming.length}>Coming up</SectionTitle> : null}
      {upcoming.map((d) => <DoseCard key={d.medicine.id + d.key} dose={d} onTake={onTake} onUndo={onUndo} onSnooze={onSnooze} />)}

      {done.length > 0 ? <SectionTitle count={done.length}>Taken</SectionTitle> : null}
      {done.map((d) => <DoseCard key={d.medicine.id + d.key} dose={d} onTake={onTake} onUndo={onUndo} onSnooze={onSnooze} />)}
    </View>
  );
}
