# Directory Structure
```
src/
  content/
    App.tsx
    constants.ts
    index.tsx
    Indicator.tsx
    style.css
    types.ts
    useDrag.ts
  background.ts
  types.ts
.eslintrc.cjs
.prettierrc.json
package.json
postcss.config.js
tailwind.config.js
tsconfig.json
vite.config.ts
```

# Files

## File: src/content/constants.ts
```typescript
import type { Status } from './types';

export const statusConfig: Record<
  Status,
  { bgColor: string; text: string; animate: boolean }
> = {
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
  paused: {
    bgColor: 'bg-orange-500',
    text: 'Paused',
    animate: false,
  },
};
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

## File: src/content/style.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## File: src/content/types.ts
```typescript
export type Status = 'monitoring' | 'running' | 'stopped' | 'error' | 'paused';

export interface IndicatorProps {
  status: Status;
  error: string | null;
  elapsedTime: number;
  onPauseResume: () => void;
}
```

## File: src/content/useDrag.ts
```typescript
import { useState, useCallback, RefObject, useEffect, useRef } from 'react';

const STORAGE_KEY = 'indicator-position';

interface Position {
  x: number;
  y: number;
}

export function useDrag(ref: RefObject<HTMLElement>) {
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 250, // Initial position top-right
    y: 20,
  });
  const positionRef = useRef(position);

  // Load position from storage on initial mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (
        result[STORAGE_KEY] &&
        typeof result[STORAGE_KEY].x === 'number' &&
        typeof result[STORAGE_KEY].y === 'number'
      ) {
        setPosition(result[STORAGE_KEY]);
      }
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  // Keep ref in sync with state for access in callbacks
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevents text selection while dragging
      e.preventDefault();

      const startPos = { x: e.clientX, y: e.clientY };
      const elementStartPos = positionRef.current; // Use ref to get position at drag start
      const element = ref.current;
      if (!element) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startPos.x;
        const dy = moveEvent.clientY - startPos.y;
        setPosition({
          x: elementStartPos.x + dx,
          y: elementStartPos.y + dy,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // On mouse up, the drag is over. The `position` state has been updated
        // by the last `handleMouseMove`. The `useEffect` listening to `position`
        // will have updated `positionRef.current`. We can now save it.
        chrome.storage.local.set({ [STORAGE_KEY]: positionRef.current });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [ref] // No dependency on `position` state
  );

  return {
    position,
    setPosition, // Expose setPosition for potential programmatic updates
    handleMouseDown,
  };
}
```

## File: src/types.ts
```typescript
export interface NotificationContext {
  tabId: number;
  windowId: number;
  durationMs?: number | null;
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

## File: src/content/Indicator.tsx
```typescript
import { useRef, useEffect, useState } from 'react';
import { useDrag } from './useDrag';
import { statusConfig } from './constants';
import type { IndicatorProps } from './types';

function formatElapsedTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}

function Indicator({
  status,
  error,
  elapsedTime,
  onPauseResume,
}: IndicatorProps) {
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
  const isPausable =
    status === 'running' || status === 'paused' || status === 'monitoring';

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
          {(status === 'running' ||
            status === 'paused' ||
            status === 'stopped') && (
            <span className="text-sm font-mono text-gray-300">
              {formatElapsedTime(elapsedTime)}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {isPausable && (
            <button
              onClick={onPauseResume}
              className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
              title={status === 'paused' ? 'Resume' : 'Pause'}
            >
              {status === 'running' || status === 'monitoring' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="block"
                >
                  <path d="M14 19h4V5h-4v14zm-8 0h4V5H6v14z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="block"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
            title="Hide Indicator"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="block"
            >
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>
      </div>
      {status === 'error' && error && (
        <p className="text-xs text-red-400 px-2 pb-2 -mt-1">{error}</p>
      )}
    </div>
  );
}

export default Indicator;
```

## File: src/content/App.tsx
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import Indicator from './Indicator';
import type { Status } from './types';

function App() {
  const [status, setStatus] = useState<Status>('monitoring');
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const prePauseStatusRef = useRef<Status>('monitoring');

  useEffect(() => {
    let intervalId: number | undefined;

    if (status === 'running') {
      intervalId = window.setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const totalElapsed =
            now - startTimeRef.current - pausedTimeRef.current;
          setElapsedTime(totalElapsed);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status]);

  const handlePauseResume = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus === 'running' || currentStatus === 'monitoring') {
        // Pausing
        prePauseStatusRef.current = currentStatus; // Store where we came from

        if (currentStatus === 'running') {
          pauseStartRef.current = Date.now();
          // Update elapsed time one last time before pausing interval
          if (startTimeRef.current) {
            setElapsedTime(
              Date.now() - startTimeRef.current - pausedTimeRef.current
            );
          }
        }
        return 'paused';
      }

      if (currentStatus === 'paused') {
        // Resuming
        const resumeTo = prePauseStatusRef.current;
        if (resumeTo === 'running') {
          if (pauseStartRef.current) {
            pausedTimeRef.current += Date.now() - pauseStartRef.current;
            pauseStartRef.current = null;
          }
        }
        // Resume to the state we were in before pausing
        return resumeTo;
      }

      return currentStatus;
    });
  }, []);

  const checkState = useCallback(() => {
    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );

      setStatus((prevStatus) => {
        // Prevent checkState from overriding pause. `prevStatus` is the
        // source of truth from React's state.
        if (prevStatus === 'paused') return 'paused';

        const wasRunning = prevStatus === 'running';

        if (wasRunning && !stopButtonExists) {
          // State transition: running -> stopped
          const endTime = Date.now();
          const finalElapsedTime = startTimeRef.current
            ? endTime - startTimeRef.current - pausedTimeRef.current
            : 0;
          setElapsedTime(finalElapsedTime < 0 ? 0 : finalElapsedTime);

          if (finalElapsedTime >= 3000) {
            console.log(
              'AI Studio process finished. Sending desktop notification.'
            );
            chrome.runtime.sendMessage({
              type: 'processFinished',
              durationMs: finalElapsedTime,
            });
          } else {
            console.log(
              'AI Studio process finished in under 3 seconds. Skipping desktop notification.'
            );
          }
          startTimeRef.current = null;
          pausedTimeRef.current = 0;
          pauseStartRef.current = null;
          return 'stopped';
        }

        const newStatus = stopButtonExists ? 'running' : 'monitoring';

        if (newStatus === 'running' && prevStatus !== 'running') {
          // State transition: not running -> running
          startTimeRef.current = Date.now();
          pausedTimeRef.current = 0;
          pauseStartRef.current = null;
          setElapsedTime(0);
        }

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
    // When paused, the observer should not be active to save resources.
    if (status === 'paused') {
      // The cleanup function of the previous effect run has already disconnected
      // the observer. We don't set up a new one while paused.
      return;
    }

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
      console.log('AI Studio Notifier: MutationObserver disconnected.');
    };
  }, [checkState, status]);

  return (
    <Indicator
      status={status}
      error={error}
      elapsedTime={elapsedTime}
      onPauseResume={handlePauseResume}
    />
  );
}

export default App;
```

## File: src/background.ts
```typescript
import type { NotificationContext } from './types';

// Context for notifications is stored in chrome.storage.local to survive
// service worker termination. A `notification:` prefix is used for the key.

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 500) {
    return '';
  }

  // Round to nearest second
  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 1) {
    return '';
  }

  if (totalSeconds < 60) {
    return `in ${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `in ${minutes}m`;
  }

  return `in ${minutes}m ${seconds}s`;
}

/**
 * Creates and displays a desktop notification.
 * @param context - The context containing the tab and window IDs.
 */
function createNotification(context: NotificationContext) {
  const durationString = formatDuration(context.durationMs);
  const message = `Your process has finished!${
    durationString ? ` ${durationString}` : ''
  }`;
  // The notificationId is guaranteed to be unique for the session.
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'AI Studio',
      message: message,
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
      const context: NotificationContext = {
        tabId: sender.tab.id,
        windowId: sender.tab.windowId,
        durationMs: message.durationMs,
      };
      createNotification(context);
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
    const context = data[alarm.name] as NotificationContext | undefined;

    if (context) {
      console.log(`Re-creating notification from alarm: ${alarm.name}`);
      createNotification(context);
      // Clean up the storage
      await chrome.storage.local.remove(alarm.name);
    }
  }
});
```
