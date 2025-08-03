# Directory Structure
```
src/
  background.ts
  content.ts
  manifest.json
.eslintrc.cjs
.prettierrc.json
package.json
README.md
tsconfig.json
```

# Files

## File: src/background.ts
````typescript
// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'processFinished') {
    console.log('Background script received processFinished message.');

    // Create a desktop notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon128.png', // An icon is required for basic notifications
      title: 'AI Studio',
      message: 'Your process has finished!',
      priority: 2, // High priority
    });
  }
});
````

## File: src/content.ts
````typescript
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
````

## File: src/manifest.json
````json
{
  "manifest_version": 3,
  "name": "AI Studio Notifier",
  "version": "1.2.0",
  "description": "Plays a sound and shows a notification when a process in Google AI Studio finishes.",
  "permissions": [
    "notifications"
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
````

## File: .eslintrc.cjs
````
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
````

## File: .prettierrc.json
````json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80
}
````

## File: package.json
````json
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
````

## File: README.md
````markdown
# AI Studio Notifier

This Chrome extension plays a sound and shows a desktop notification when a process in Google AI Studio finishes.

This project is set up with TypeScript, ESLint, and Prettier for a modern, robust development experience.

## Development Setup

1.  **Install Node.js:** If you don't have it, install Node.js (which includes npm).
2.  **Clone the repository:** `git clone <repository-url>`
3.  **Navigate to the directory:** `cd ai-studio-notifier`
4.  **Install dependencies:**
    ```bash
    npm install
    ```

## Building the Extension

To build the extension from the TypeScript source code, run the build script:
````

## File: tsconfig.json
````json
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
````
