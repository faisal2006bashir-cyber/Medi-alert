import React from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, ProgressBar } from '../components/ui';
import { useColors } from '../theme';
import { formatTime, getStatus, toDateString } from '../logic';

const pillText = (count) => `${count} pill${count === 1 ? '' : 's'}`;
const dayText = (count) => `${count} day${count === 1 ? '' : 's'}`;

/** Lists every medicine with its course progress and remaining supply. */
export default function MedicinesScreen({ medicines, now, onRefill, onDelete }) {
  const c = useColors();
  const today = toDateString(now);

  const confirmDelete = (medicine) => {
    Alert.alert('Delete medicine', `Delete ${medicine.name}? Its alarms will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(medicine.id) }
    ]);
  };

  if (medicines.length === 0) {
    return <EmptyState icon="medkit-outline" title="No medicines yet" text="Tap the + button to add a medicine." />;
  }

  return (
    <View>
      {medicines.map((medicine) => {
        const status = getStatus(medicine, today);
        const fraction = medicine.initial > 0 ? medicine.stock / medicine.initial : 0;
        const courseLabel = status.finished
          ? 'Course complete'
          : status.daysLeft !== null ? `${dayText(status.daysLeft)} left in course` : 'Ongoing';

        return (
          <Card key={medicine.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="medkit" size={22} color={c.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700', fontSize: 17 }}>{medicine.name}</Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  {pillText(medicine.dose)} at {medicine.times.map(formatTime).join(', ')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
              <Badge icon="calendar-outline" label={courseLabel} />
              <Badge tone={status.needsRefill ? 'warn' : 'ok'} icon="layers-outline" label={`${pillText(medicine.stock)} covers ${dayText(status.supplyDays)}`} />
              {status.needsRefill && !status.finished ? (
                <Badge tone="warn" icon="basket-outline" label={status.shortfall ? `Buy at least ${pillText(status.shortfall)}` : 'Plan to buy more'} />
              ) : null}
            </View>

            <View style={{ marginTop: 12 }}>
              <ProgressBar value={fraction} tone={status.needsRefill ? 'warn' : undefined} />
              <Text style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>{medicine.stock} of {medicine.initial} pills left</Text>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button label="I bought more" icon="add-circle-outline" onPress={() => onRefill(medicine)} />
              <Button label="Delete" variant="danger" icon="trash-outline" onPress={() => confirmDelete(medicine)} style={{ marginLeft: 8, borderWidth: 0, backgroundColor: 'transparent' }} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}
