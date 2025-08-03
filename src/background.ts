interface NotificationContext {
  tabId: number;
  windowId: number;
}

// Map to hold context for active notifications
const notificationContexts = new Map<string, NotificationContext>();

/**
 * Creates and displays a desktop notification.
 * @param context - The context containing the tab and window IDs.
 */
function createNotification(context: NotificationContext) {
  // The notificationId is guaranteed to be unique for the session.
  // We can use it as the base for the alarm name.
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'assets/icon128.png',
      title: 'AI Studio',
      message: 'Your process has finished!',
      priority: 2,
      // `requireInteraction: false` is the default. It means the notification
      // will auto-dismiss after a short time. On some OSes (like Windows),
      // notifications with buttons may persist in an action center regardless.
      requireInteraction: false,
      buttons: [
        { title: 'View' },
        { title: 'Dismiss' },
        { title: 'Remind in 5 mins' },
      ],
    },
    (notificationId) => {
      if (notificationId) {
        notificationContexts.set(notificationId, context);
      }
    }
  );
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'processFinished') {
    console.log('Background script received processFinished message.');

    if (sender.tab?.id && sender.tab?.windowId) {
      createNotification({
        tabId: sender.tab.id,
        windowId: sender.tab.windowId,
      });
    } else {
      console.error(
        'Could not create notification: sender tab details are missing.'
      );
    }
  }
});

// Listener for when a user clicks a button on the notification
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    const context = notificationContexts.get(notificationId);
    if (!context) {
      return;
    }

    switch (buttonIndex) {
      case 0: // View
        chrome.windows.update(context.windowId, { focused: true });
        chrome.tabs.update(context.tabId, { active: true });
        // Clearing the notification will trigger the onClosed listener for cleanup
        chrome.notifications.clear(notificationId);
        break;
      case 1: // Dismiss
        chrome.notifications.clear(notificationId);
        break;
      case 2: // Remind
        {
          const alarmName = `remind-${notificationId}`;
          // Store context for when the alarm fires
          chrome.storage.local.set({ [alarmName]: context }).then(() => {
            chrome.alarms.create(alarmName, { delayInMinutes: 5 });
            chrome.notifications.clear(notificationId);
          });
        }
        break;
    }
  }
);

// Listener for when a notification is closed (programmatically or by user)
// This is crucial for cleaning up the context map to prevent memory leaks.
chrome.notifications.onClosed.addListener((notificationId) => {
  notificationContexts.delete(notificationId);
  console.log(`Cleaned up context for closed notification: ${notificationId}`);
});

// Listener for alarms (for the "Remind" feature)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('remind-')) {
    const data = await chrome.storage.local.get(alarm.name);
    const context = data[alarm.name];

    if (context) {
      console.log(`Re-creating notification from alarm: ${alarm.name}`);
      createNotification(context);
      // Clean up the storage
      await chrome.storage.local.remove(alarm.name);
    }
  }
});