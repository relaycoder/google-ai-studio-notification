# Directory Structure
```
src/
  content/
    App.tsx
    index.tsx
    Indicator.tsx
    style.css
    useDrag.ts
  background.ts
.eslintrc.cjs
.prettierrc.json
package.json
postcss.config.js
tailwind.config.js
tsconfig.json
vite.config.ts
```

# Files

## File: src/content/App.tsx
```typescript
import { useState, useEffect, useCallback } from 'react';
import Indicator from './Indicator';

export type Status = 'monitoring' | 'running' | 'stopped' | 'error';

function App() {
  const [status, setStatus] = useState<Status>('monitoring');
  const [error, setError] = useState<string | null>(null);

  const checkState = useCallback(() => {
    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );

      setStatus((prevStatus) => {
        const wasRunning = prevStatus === 'running';
        if (wasRunning && !stopButtonExists) {
          // State transition: running -> stopped
          console.log(
            'AI Studio process finished. Playing sound and sending desktop notification.'
          );
          chrome.runtime.sendMessage({ type: 'processFinished' });
          return 'stopped';
        }

        const newStatus = stopButtonExists ? 'running' : 'monitoring';
        if (
          prevStatus !== newStatus &&
          !(prevStatus === 'stopped' && newStatus === 'monitoring')
        ) {
          console.log(
            `AI Studio Notifier: State changed to ${
              stopButtonExists ? 'Running' : 'Monitoring'
            }`
          );
        }
        // If we were stopped, and a new process hasn't started, stay stopped visually
        // until a new run starts.
        if (prevStatus === 'stopped' && !stopButtonExists) {
            return 'stopped';
        }

        return newStatus;
      });
      setError(null);
    } catch (e) {
      console.error('AI Studio Notifier: Error during state check.', e);
      setError('An error occurred during check.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Initial Check after a short delay
    const timeoutId = setTimeout(checkState, 2000);

    // Observer Setup
    const observer = new MutationObserver(checkState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    console.log(
      'AI Studio Notifier: MutationObserver is now watching the page.'
    );

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [checkState]);

  return <Indicator status={status} error={error} />;
}

export default App;
```

## File: src/content/index.tsx
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// Create a root element to mount the React app
const rootEl = document.createElement('div');
rootEl.id = 'ai-studio-notifier-root';
document.body.appendChild(rootEl);

// Render the App component
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## File: src/content/Indicator.tsx
```typescript
import { useRef, useEffect, useState } from 'react';
import { useDrag } from './useDrag';
import type { Status } from './App';

interface IndicatorProps {
  status: Status;
  error: string | null;
}

const statusConfig: Record<Status, { bgColor: string; text: string; animate: boolean }> = {
  monitoring: {
    bgColor: 'bg-blue-500',
    text: 'Monitoring',
    animate: false,
  },
  running: {
    bgColor: 'bg-green-500',
    text: 'Process Running',
    animate: true,
  },
  stopped: {
    bgColor: 'bg-yellow-500',
    text: 'Process Finished!',
    animate: false,
  },
  error: {
    bgColor: 'bg-red-500',
    text: 'Error!',
    animate: false,
  },
};

function Indicator({ status, error }: IndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const { position, handleMouseDown } = useDrag(indicatorRef);
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio element when component mounts
    const soundUrl = chrome.runtime.getURL('notification.mp3');
    audioRef.current = new Audio(soundUrl);
  }, []);

  useEffect(() => {
    if (status === 'stopped') {
      audioRef.current
        ?.play()
        .catch((err) => console.error('Audio play failed: ', err));
    }
  }, [status]);

  if (!isVisible) {
    return null;
  }

  const config = statusConfig[status];

  return (
    <div
      ref={indicatorRef}
      className="fixed top-0 left-0 z-[99999] rounded-lg shadow-lg text-white font-sans select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="flex items-center gap-3 p-2 cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${config.bgColor} ${
              config.animate ? 'animate-pulse' : ''
            }`}
          ></span>
          <span className="text-sm font-medium">{config.text}</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs text-gray-400 hover:text-white cursor-pointer"
          title="Hide Indicator"
        >
          &#x2715;
        </button>
      </div>
      {status === 'error' && error && (
        <p className="text-xs text-red-400 px-2 pb-2 -mt-1">{error}</p>
      )}
    </div>
  );
}

export default Indicator;
```

## File: src/content/style.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## File: src/content/useDrag.ts
```typescript
import { useState, useCallback, RefObject } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDrag(ref: RefObject<HTMLElement>) {
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 250, // Initial position top-right
    y: 20,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevents text selection while dragging
      e.preventDefault();

      const startPos = { x: e.clientX, y: e.clientY };
      const element = ref.current;
      if (!element) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startPos.x;
        const dy = moveEvent.clientY - startPos.y;
        setPosition({
          x: position.x + dx,
          y: position.y + dy,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [position.x, position.y, ref]
  );

  return {
    position,
    setPosition, // Expose setPosition for potential programmatic updates
    handleMouseDown,
  };
}
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

## File: postcss.config.js
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## File: tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## File: vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: 'inline', // Recommended for debugging extensions
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        content: 'src/content/index.tsx',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          // The CSS file from our content script entry should be at the root.
          if (assetInfo.name?.endsWith('.css')) {
            return 'content.css';
          }
          // Keep other assets in an assets folder if any are generated by rollup.
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
```

## File: src/background.ts
```typescript
interface NotificationContext {
  tabId: number;
  windowId: number;
}

// Context for notifications is stored in chrome.storage.local to survive
// service worker termination. A `notification:` prefix is used for the key.

/**
 * Creates and displays a desktop notification.
 * @param context - The context containing the tab and window IDs.
 */
function createNotification(context: NotificationContext) {
  // The notificationId is guaranteed to be unique for the session.
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'AI Studio',
      message: 'Your process has finished!',
      priority: 2,
      // `requireInteraction: false` is the default. It means the notification
      // will auto-dismiss after a short time. On some OSes (like Windows),
      // notifications with buttons may persist in an action center regardless.
      requireInteraction: false,
      buttons: [
        { title: 'Go To Tab' },
        { title: 'Dismiss' },
        { title: 'Remind 5 in' },
      ],
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
  async (notificationId, buttonIndex) => {
    const storageKey = `notification:${notificationId}`;
    const data = await chrome.storage.local.get(storageKey);
    const context = data[storageKey] as NotificationContext | undefined;

    if (!context) {
      console.warn(`No context found for notification: ${notificationId}`);
      return;
    }

    switch (buttonIndex) {
      case 0: // Go To Tab
        chrome.windows.update(context.windowId, { focused: true });
        chrome.tabs.update(context.tabId, { active: true });
        // Clearing the notification will trigger the onClosed listener for cleanup
        chrome.notifications.clear(notificationId);
        break;
      case 1: // Dismiss
        chrome.notifications.clear(notificationId);
        break;
      case 2: // Remind 5 min 5 min
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

## File: .eslintrc.cjs
```
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es6: true,
  },
  rules: {
    // Add any custom rules here
    'react/react-in-jsx-scope': 'off',
  },
};
```

## File: package.json
```json
{
  "name": "ai-studio-notifier",
  "version": "1.3.0",
  "description": "Plays a sound and shows a notification when a process in Google AI Studio finishes.",
  "private": true,
  "type": "module",
  "scripts": {
    "watch": "vite build --watch",
    "build": "vite build",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.251",
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "postcss": "^8.4.32",
    "prettier": "^3.1.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.10"
  }
}
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "vite.config.ts", "tailwind.config.js", "postcss.config.js"],
  "exclude": ["node_modules", "dist"]
}
```
