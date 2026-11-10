const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value) => (value < 10 ? `0${value}` : String(value));

/** Formats a Date as YYYY, MM, DD text in local time. */
export function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Returns the number of whole days between two date strings. */
export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / MS_PER_DAY);
}

/** Converts a time string such as "14:30" into minutes after midnight. */
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Converts a 24 hour time string into a readable 12 hour label. */
export function formatTime(time) {
  const [hours, minutes] = time.split(':');
  return `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`;
}

/** Converts a Date into a "HH:MM" time string. */
export function dateToTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a "HH:MM" time string into a Date set to today. */
export function timeToDate(time) {
  const date = new Date();
  date.setHours(Math.floor(toMinutes(time) / 60), toMinutes(time) % 60, 0, 0);
  return date;
}

/** Returns true when a dose was already marked as taken on the given day. */
export function isTaken(medicine, day, time) {
  return (medicine.log[day] || []).includes(time);
}

/**
 * Calculates the current status of a medicine.
 *
 * daysLeft is the number of course days remaining, or null for an ongoing course.
 * supplyDays is how many full days the current stock will last.
 * needsRefill is true when supply is low and will not cover the rest of the course.
 * shortfall is the number of extra pills needed to finish the course.
 */
export function getStatus(medicine, today) {
  const pillsPerDay = medicine.times.length * medicine.dose;
  const elapsed = daysBetween(medicine.start, today);
  const hasEndDate = medicine.days > 0;
  const daysLeft = hasEndDate ? Math.max(0, medicine.days - elapsed) : null;
  const supplyDays = pillsPerDay > 0 ? Math.floor(medicine.stock / pillsPerDay) : 0;
  const outOfStock = medicine.stock < medicine.dose;
  const coversCourse = daysLeft !== null && supplyDays >= daysLeft;

  return {
    started: elapsed >= 0,
    finished: hasEndDate && daysLeft === 0,
    daysLeft,
    supplyDays,
    outOfStock,
    needsRefill: outOfStock || (supplyDays <= medicine.lead && !coversCourse),
    shortfall: daysLeft !== null ? Math.max(0, daysLeft * pillsPerDay - medicine.stock) : 0
  };
}

/* ------------------------------------------------------------------ */
/* Alarm helpers                                                       */
/* ------------------------------------------------------------------ */

export const SNOOZE_MINUTES = 10;
export const RING_WINDOW_MS = 45 * 60 * 1000;

/** Builds a stable key for one dose on one day, such as "2026-11-07|08:00". */
export function doseKey(day, time) {
  return `${day}|${time}`;
}

/** Returns the date string that is the given number of days after another date string. */
export function addDays(day, count) {
  const [year, month, date] = day.split('-').map(Number);
  return toDateString(new Date(year, month - 1, date + count));
}

/** Converts a date string and a "HH:MM" time into milliseconds since the epoch, in local time. */
export function dayTimeMs(day, time) {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hours, minutes, 0, 0).getTime();
}

/** Returns when a snoozed dose rings again, or 0 when it is not snoozed. */
export function snoozeUntil(medicine, day, time) {
  return (medicine.snooze || {})[doseKey(day, time)] || 0;
}

/** True for doses earlier than the minute the medicine was added on its first day. */
export function isBeforeStart(medicine, day, time) {
  if (!medicine.createdAt || day !== medicine.start) {
    return false;
  }
  const created = new Date(medicine.createdAt);
  return toMinutes(time) <= created.getHours() * 60 + created.getMinutes();
}

/**
 * Lists every dose scheduled for today, sorted by time.
 * ringFrom is when the dose next sounds: its scheduled time, or the end of a snooze.
 */
export function listTodayDoses(medicines, now) {
  const today = toDateString(now);
  const nowMs = now.getTime();
  const doses = [];

  medicines.forEach((medicine) => {
    const status = getStatus(medicine, today);
    if (!status.started || status.finished) {
      return;
    }
    medicine.times.forEach((time) => {
      if (isBeforeStart(medicine, today, time)) {
        return;
      }
      const taken = isTaken(medicine, today, time);
      const scheduledMs = dayTimeMs(today, time);
      const snoozedUntil = snoozeUntil(medicine, today, time);
      const ringFrom = Math.max(scheduledMs, snoozedUntil);
      doses.push({
        medicine, day: today, time, key: doseKey(today, time), taken, scheduledMs, ringFrom,
        snoozed: !taken && snoozedUntil > nowMs,
        due: !taken && ringFrom <= nowMs
      });
    });
  });

  return doses.sort((a, b) => a.scheduledMs - b.scheduledMs);
}

/** Identifies one ring of one dose. A snooze changes ringFrom, so the alarm can sound again. */
export function ringId(dose) {
  return `${dose.medicine.id}|${dose.key}|${dose.ringFrom}`;
}

/** Returns the doses that should be ringing now: due, not taken, and not silenced. */
export function getRingingDoses(doses, nowMs, silenced) {
  return doses
    .filter((d) => !d.taken && d.ringFrom <= nowMs && nowMs < d.ringFrom + RING_WINDOW_MS && !silenced.has(ringId(d)))
    .sort((a, b) => a.ringFrom - b.ringFrom);
}

/** Returns the next moment a dose starts ringing, or null when nothing is left today. */
export function nextRingMs(doses, nowMs) {
  const upcoming = doses.filter((d) => !d.taken && d.ringFrom > nowMs).map((d) => d.ringFrom);
  return upcoming.length ? Math.min(...upcoming) : null;
}

/** Turns a number of milliseconds into text such as "in 1 h 20 min". */
export function formatCountdown(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < 60) {
    return `in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
}
