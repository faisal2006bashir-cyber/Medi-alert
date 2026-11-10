import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SNOOZE_MINUTES } from './logic';
import { buildReminders } from './schedule';

// A new channel id is needed because Android never updates the settings of a channel that already exists.
const CHANNEL_ID = 'medicine-alarm';
const OLD_CHANNEL_ID = 'medicine-reminders';
const CATEGORY_ID = 'dose';

export const ACTION_TAKEN = 'TAKEN';
export const ACTION_SNOOZE = 'SNOOZE';

// Shows reminders as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

/**
 * Creates the alarm channel, the action buttons, and asks for permission.
 * Returns true when notifications are allowed.
 */
export async function setupNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL_ID);
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Medicine alarms',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 600, 300, 600, 300, 600],
        enableVibrate: true,
        enableLights: true,
        lightColor: '#0f7b6c',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false }
        }
      });
    }

    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      { identifier: ACTION_TAKEN, buttonTitle: 'I took it', options: { opensAppToForeground: true } },
      { identifier: ACTION_SNOOZE, buttonTitle: `Snooze ${SNOOZE_MINUTES} min`, options: { opensAppToForeground: true } }
    ]);
  } catch (error) {
    // The alarm styling is a bonus. Plain reminders still work without it.
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function applyReminders(medicines) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const reminder of buildReminders(medicines)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: true,
        data: reminder.data,
        ...(reminder.kind === 'refill' ? {} : { categoryIdentifier: CATEGORY_ID })
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.whenMs), channelId: CHANNEL_ID }
    });
  }
}

let running = false;
let latest = null;

/**
 * Replaces every scheduled reminder with a fresh set. Calls that arrive while a
 * run is in progress are merged so that only the newest data is applied. Without
 * this, two overlapping runs could schedule every reminder twice.
 */
export async function rescheduleReminders(medicines) {
  latest = medicines;
  if (running) {
    return;
  }
  running = true;
  try {
    while (latest) {
      const batch = latest;
      latest = null;
      try {
        await applyReminders(batch);
      } catch (error) {
        // Scheduling can fail when permission is denied. The app keeps working.
      }
    }
  } finally {
    running = false;
  }
}
