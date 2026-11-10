import {
  addDays, dayTimeMs, daysBetween, doseKey, formatTime, getStatus, isBeforeStart, isTaken,
  snoozeUntil, toDateString
} from './logic';

export const HORIZON_DAYS = 14;
export const MAX_SCHEDULED = 60;
export const REFILL_TIME = '09:00';
export const NAG_MINUTES = [5, 10];
const NAG_HORIZON_MS = 24 * 60 * 60 * 1000;

/**
 * Collects every reminder for the next two weeks. Each untaken dose gets a main
 * alarm, and doses in the next 24 hours also get follow-up alarms after 5 and
 * 10 minutes. Snoozed doses ring at the end of the snooze. A refill reminder is
 * added for each medicine that will run low. This file has no device code, so
 * it can be tested on its own.
 */
export function buildReminders(medicines, now = new Date()) {
  const nowMs = now.getTime();
  const today = toDateString(now);
  const reminders = [];

  medicines.forEach((medicine) => {
    const status = getStatus(medicine, today);
    if (status.finished) {
      return;
    }
    const pills = `${medicine.dose} pill${medicine.dose > 1 ? 's' : ''}`;

    for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
      const day = addDays(today, offset);
      const courseDay = daysBetween(medicine.start, day);
      const insideCourse = courseDay >= 0 && (medicine.days === 0 || courseDay < medicine.days);
      if (!insideCourse) {
        continue;
      }

      medicine.times.forEach((time) => {
        if (isTaken(medicine, day, time) || isBeforeStart(medicine, day, time)) {
          return;
        }
        const from = Math.max(dayTimeMs(day, time), snoozeUntil(medicine, day, time));
        const data = { medicineId: medicine.id, day, time, key: doseKey(day, time) };

        if (from > nowMs) {
          reminders.push({ whenMs: from, kind: 'dose', data, title: `Time for ${medicine.name}`, body: `Take ${pills} (${formatTime(time)}).` });
        }
        if (from - nowMs < NAG_HORIZON_MS) {
          NAG_MINUTES.forEach((minutes) => {
            const whenMs = from + minutes * 60000;
            if (whenMs > nowMs) {
              reminders.push({
                whenMs, kind: 'nag', data,
                title: `Still waiting: ${medicine.name}`,
                body: `Your ${formatTime(time)} dose is not marked as taken.`
              });
            }
          });
        }
      });
    }

    const coversCourse = status.daysLeft !== null && status.supplyDays >= status.daysLeft;
    const refillOffset = status.supplyDays - medicine.lead;
    if (!coversCourse && refillOffset >= 0 && refillOffset <= HORIZON_DAYS) {
      const whenMs = dayTimeMs(addDays(today, refillOffset), REFILL_TIME);
      if (whenMs > nowMs) {
        reminders.push({
          whenMs, kind: 'refill', data: { medicineId: medicine.id },
          title: `Plan a refill for ${medicine.name}`,
          body: `Your supply will last about ${medicine.lead} more days.`
        });
      }
    }
  });

  return reminders.sort((a, b) => a.whenMs - b.whenMs).slice(0, MAX_SCHEDULED);
}
