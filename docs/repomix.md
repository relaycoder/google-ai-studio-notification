# Directory Structure
```
src/
  background.ts
  content.ts
  manifest.json
.eslintrc.cjs
.prettierrc.json
package.json
tsconfig.json
```

# Files

## File: src/content.ts
```typescript
let isRunning = false;

function init() {
  console.log('AI Studio Notifier initializing...');
  // --- Sound Setup ---
  // Note: You must add a 'notification.mp3' file to the extension's root directory.
  const soundUrl = chrome.runtime.getURL('assets/notification.mp3');
  const audio = new Audio(soundUrl);

  function playSound() {
    audio
      .play()
      .catch((error) =>
        console.error(
          'Audio play failed. Make sure notification.mp3 exists and is valid.',
          error
        )
      );
  }

  // --- State Checking Logic ---
  function checkForStopButton() {
    // The user identified an element with class "stoppable-stop" as the indicator.
    // This selector looks for a <rect> element whose class list contains "stoppable-stop".
    // Using [class*="..."] makes it robust against other dynamic classes added by the framework.
    return document.querySelector<SVGRectElement>(
      'rect[class*="stoppable-stop"]'
    );
  }

  function checkState() {
    const stopButtonExists = !!checkForStopButton();

    if (isRunning && !stopButtonExists) {
      // This is the transition we're looking for:
      // State 1 (running, button exists) to State 2 (stopped, button absent).
      console.log(
        'AI Studio process finished. Playing sound and sending desktop notification.'
      );
      playSound();
      // Send a message to the background script to show a desktop notification
      chrome.runtime.sendMessage({ type: 'processFinished' });
    }

    // Update the current state for the next check.
    if (isRunning !== stopButtonExists) {
      console.log(
        `AI Studio Notifier: State changed to ${stopButtonExists ? 'Running' : 'Stopped'
        }`
      );
      isRunning = stopButtonExists;
    }
  }

  // --- Observer Setup ---
  const observer = new MutationObserver(() => {
    // A DOM change occurred, let's re-evaluate the state.
    checkState();
  });

  // We start observing the entire body for changes in its descendants.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log(
    'AI Studio Notifier: MutationObserver is now watching the page for changes.'
  );

  // --- Initial Check ---
  // A short delay helps ensure the page's dynamic content has loaded.
  setTimeout(checkState, 2000);
}

// The script might be injected before the body is fully available.
if (document.body) {
  init();
} else {
  // If not, wait for it.
  window.addEventListener('DOMContentLoaded', init);
}
```

## File: .eslintrc.cjs
```
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    browser: true,
    es6: true,
  },
  rules: {
    // Add any custom rules here
  },
};
```

## File: .prettierrc.json
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80
}
```

## File: package.json
```json
{
  "name": "ai-studio-notifier",
  "version": "1.2.0",
  "description": "Plays a sound and shows a notification when a process in Google AI Studio finishes.",
  "private": true,
  "scripts": {
    "build": "tsc && npm run copy-assets",
    "copy-assets": "cp src/manifest.json dist/ && cp -r public/. dist/assets",
    "lint": "eslint \"src/**/*.ts\"",
    "format": "prettier --write \"src/**/*.{ts,json}\""
  },
  "devDependencies": {
    "@types/chrome": "^0.0.251",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "eslint": "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "prettier": "^3.1.0",
    "typescript": "^5.3.2"
  }
}
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "es2020",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "typeRoots": [
      "./node_modules/@types"
    ]
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## File: src/background.ts
```typescript
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
```

## File: src/manifest.json
```json
{
  "manifest_version": 3,
  "name": "AI Studio Notifier",
  "version": "1.2.0",
  "description": "Plays a sound and shows a notification when a process in Google AI Studio finishes.",
  "permissions": [
    "notifications",
    "tabs",
    "alarms",
    "storage"
  ],
  "host_permissions": [
    "https://aistudio.google.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://aistudio.google.com/*"],
      "js": ["content.js"]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["https://aistudio.google.com/*"]
    }
  ],
  "icons": {
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  }
}
```
