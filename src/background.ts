import type { NotificationContext } from './types';

// Context for notifications is stored in chrome.storage.local to survive
// service worker termination. A `notification:` prefix is used for the key.

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) {
    return '';
  }

  // Round to nearest second
  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

/**
 * Creates and displays a desktop notification.
 * @param context - The context containing the tab and window IDs.
 */
function createNotification(context: NotificationContext) {
  const durationText = formatDuration(context.durationMs);
  const durationPart = durationText ? `in ${durationText}` : '';

  let title: string;
  if (context.runName) {
    title = ['Finished', durationPart, `- ${context.runName}`]
      .filter(Boolean)
      .join(' ');
  } else {
    title = ['AI Studio Process Finished', durationPart]
      .filter(Boolean)
      .join(' ');
  }

  const message = `Your process has finished running.`;
  // The notificationId is guaranteed to be unique for the session.
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: title,
      message: message,
      priority: 2,
      // `requireInteraction: false` is the default. It means the notification
      // will auto-dismiss after a short time. On some OSes (like Windows),
      // notifications with buttons may persist in an action center regardless.
      requireInteraction: false,
      buttons: [{ title: 'Dismiss' }, { title: 'Remind in 5 min' }],
    },
    (notificationId) => {
      if (notificationId) {
        const storageKey = `notification:${notificationId}`;
        chrome.storage.local.set({ [storageKey]: context });
        console.log(
          `Notification created: ${notificationId}. Context stored.`
        );
      }
    }
  );
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'processFinished') {
    console.log('Background script received processFinished message.');

    if (sender.tab?.id && sender.tab?.windowId) {
      const context: NotificationContext = {
        tabId: sender.tab.id,
        windowId: sender.tab.windowId,
        durationMs: message.durationMs,
        runName: message.runName,
      };
      createNotification(context);
    } else {
      console.error(
        'Could not create notification: sender tab details are missing.'
      );
    }
  }
});

// Listener for when a user clicks the body of a notification
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const storageKey = `notification:${notificationId}`;
  const data = await chrome.storage.local.get(storageKey);
  const context = data[storageKey] as NotificationContext | undefined;

  if (!context) {
    console.warn(`No context found for clicked notification: ${notificationId}`);
    return;
  }

  // When the notification is clicked, focus the relevant tab
  chrome.windows.update(context.windowId, { focused: true });
  chrome.tabs.update(context.tabId, { active: true });

  // Clear the notification, which will also trigger onClosed for cleanup
  chrome.notifications.clear(notificationId);
});

// Listener for when a user clicks a button on the notification
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    const storageKey = `notification:${notificationId}`;
    const data = await chrome.storage.local.get(storageKey);
    const context = data[storageKey] as NotificationContext | undefined;

    if (!context) {
      console.warn(`No context found for notification: ${notificationId}`);
      return;
    }

    switch (buttonIndex) {
      case 0: // Dismiss
        chrome.notifications.clear(notificationId);
        break;
      case 1: // Remind in 5 min
        {
          const alarmName = `remind-${notificationId}`;
          // Store context for when the alarm fires
          await chrome.storage.local.set({ [alarmName]: context });
          chrome.alarms.create(alarmName, { delayInMinutes: 5 });
          // Clearing the notification will also trigger onClosed, which cleans
          // up the original `notification:<id>` storage.
          chrome.notifications.clear(notificationId);
        }
        break;
    }
  }
);

// Listener for when a notification is closed (programmatically or by user)
// This is crucial for cleaning up storage to prevent exceeding quotas.
chrome.notifications.onClosed.addListener((notificationId) => {
  const storageKey = `notification:${notificationId}`;
  // We don't need to await this, it can run in the background.
  chrome.storage.local.remove(storageKey);
  console.log(
    `Cleaned up storage for closed notification: ${notificationId}`
  );
});

// Listener for alarms (for the "Remind" feature)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('remind-')) {
    const data = await chrome.storage.local.get(alarm.name);
    const context = data[alarm.name] as NotificationContext | undefined;

    if (context) {
      console.log(`Re-creating notification from alarm: ${alarm.name}`);
      createNotification(context);
      // Clean up the storage
      await chrome.storage.local.remove(alarm.name);
    }
  }
});