# Directory Structure
```
src/
  content/
    App.tsx
    constants.ts
    index.tsx
    Indicator.tsx
    style.css
    useMovable.ts
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

## File: src/content/useMovable.ts
```typescript
import { useState, useCallback, RefObject, useEffect, useRef } from 'react';

const POSITION_STORAGE_KEY = 'indicator-position';
const SIZE_STORAGE_KEY = 'indicator-size';

interface Position {
  x: number;
  y: number;
}
interface Size {
  width: number;
  height: number;
}
type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

const EDGE_SENSITIVITY = 8; // px

function initDragInteraction(
  onMove: (e: MouseEvent) => void,
  onEnd: (didMove: boolean) => void
) {
  let didInteract = false;
  const handleMouseMove = (moveEvent: MouseEvent) => {
    didInteract = true;
    onMove(moveEvent);
  };
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    onEnd(didInteract);
  };
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

export function useMovable(
  ref: RefObject<HTMLElement>,
  options: {
    onDragHandleClick?: () => void;
    isResizable?: boolean;
    initialSize?: Size;
    minSize?: Size;
    dragHandleClassName?: string;
  }
) {
  const {
    onDragHandleClick,
    isResizable = false,
    initialSize = { width: 256, height: 300 },
    minSize = { width: 220, height: 150 },
    dragHandleClassName,
  } = options;

  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - (initialSize.width + 20),
    y: 20,
  });
  const [size, setSize] = useState<Size>(initialSize);

  const stateRef = useRef({ position, size });

  useEffect(() => {
    chrome.storage.local.get(
      [POSITION_STORAGE_KEY, SIZE_STORAGE_KEY],
      (result) => {
        const storedPosition = result[POSITION_STORAGE_KEY];
        if (
          storedPosition &&
          typeof storedPosition.x === 'number' &&
          typeof storedPosition.y === 'number'
        ) {
          setPosition(storedPosition);
        }
        const storedSize = result[SIZE_STORAGE_KEY];
        if (
          isResizable &&
          storedSize &&
          typeof storedSize.width === 'number' &&
          typeof storedSize.height === 'number'
        ) {
          setSize(storedSize);
        }
      }
    );
  }, [isResizable]);

  useEffect(() => {
    stateRef.current = { position, size };
  }, [position, size]);

  const getResizeEdges = (
    e: React.MouseEvent<HTMLDivElement>,
    element: HTMLElement
  ): Edges | null => {
    if (!isResizable) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: e.clientY < rect.top + EDGE_SENSITIVITY,
      bottom: e.clientY > rect.bottom - EDGE_SENSITIVITY,
      left: e.clientX < rect.left + EDGE_SENSITIVITY,
      right: e.clientX > rect.right - EDGE_SENSITIVITY,
    };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only for left mouse button
      if (e.button !== 0) return;

      const element = ref.current;
      if (!element) return;

      const isDragHandle = dragHandleClassName
        ? !!(e.target as HTMLElement).closest(`.${dragHandleClassName}`)
        : true;
      const edges = getResizeEdges(e, element);
      const isResizing =
        edges && (edges.top || edges.bottom || edges.left || edges.right);

      if (isResizing && edges) {
        e.preventDefault();
        e.stopPropagation();

        const startMousePos = { x: e.clientX, y: e.clientY };
        const { position: startElementPos, size: startElementSize } =
          stateRef.current;

        const handleMouseMoveResize = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startMousePos.x;
          const dy = moveEvent.clientY - startMousePos.y;

          let newWidth = startElementSize.width;
          let newHeight = startElementSize.height;
          let newX = startElementPos.x;
          let newY = startElementPos.y;

          if (edges.right) {
            newWidth = Math.max(minSize.width, startElementSize.width + dx);
          }
          if (edges.left) {
            const proposedWidth = startElementSize.width - dx;
            if (proposedWidth >= minSize.width) {
              newWidth = proposedWidth;
              newX = startElementPos.x + dx;
            }
          }
          if (edges.bottom) {
            newHeight = Math.max(minSize.height, startElementSize.height + dy);
          }
          if (edges.top) {
            const proposedHeight = startElementSize.height - dy;
            if (proposedHeight >= minSize.height) {
              newHeight = proposedHeight;
              newY = startElementPos.y + dy;
            }
          }

          setPosition({ x: newX, y: newY });
          setSize({ width: newWidth, height: newHeight });
        };

        initDragInteraction(handleMouseMoveResize, (didMove) => {
          if (didMove) {
            chrome.storage.local.set({
              [POSITION_STORAGE_KEY]: stateRef.current.position,
              [SIZE_STORAGE_KEY]: stateRef.current.size,
            });
          }
        });
      } else if (isDragHandle) {
        e.preventDefault();
        const startMousePos = { x: e.clientX, y: e.clientY };
        const { position: startElementPos } = stateRef.current;

        const handleMouseMoveDrag = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startMousePos.x;
          const dy = moveEvent.clientY - startMousePos.y;
          setPosition({
            x: startElementPos.x + dx,
            y: startElementPos.y + dy,
          });
        };

        initDragInteraction(handleMouseMoveDrag, (didMove) => {
          if (didMove) {
            chrome.storage.local.set({
              [POSITION_STORAGE_KEY]: stateRef.current.position,
            });
          } else if (onDragHandleClick) {
            onDragHandleClick();
          }
        });
      }
    },
    [
      ref,
      isResizable,
      minSize.width,
      minSize.height,
      onDragHandleClick,
      dragHandleClassName,
    ]
  );

  const handleMouseMoveForCursor = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isResizable || e.buttons > 0) return;
      const element = ref.current;
      if (!element) return;
      const edges = getResizeEdges(e, element);
      if (!edges) return;

      let cursor = 'auto';
      if (edges.top && edges.left) cursor = 'nwse-resize';
      else if (edges.top && edges.right) cursor = 'nesw-resize';
      else if (edges.bottom && edges.left) cursor = 'nesw-resize';
      else if (edges.bottom && edges.right) cursor = 'nwse-resize';
      else if (edges.left || edges.right) cursor = 'ew-resize';
      else if (edges.top || edges.bottom) cursor = 'ns-resize';

      if (cursor === 'auto') {
        const isDragHandle = dragHandleClassName
          ? !!(e.target as HTMLElement).closest(`.${dragHandleClassName}`)
          : false;
        if (isDragHandle) {
          cursor = 'grab';
        }
      }

      // To avoid flickering, only set cursor if it needs to change
      if (element.style.cursor !== cursor) {
        element.style.cursor = cursor;
      }
    },
    [ref, isResizable, dragHandleClassName]
  );

  return { position, size, handleMouseDown, handleMouseMoveForCursor };
}
```

## File: src/content/constants.ts
```typescript
import type { Status } from '../types';

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

## File: src/types.ts
```typescript
export type Status = 'monitoring' | 'running' | 'stopped' | 'error' | 'paused';

export interface RunHistoryEntry {
  id: string;
  runName: string | null;
  durationMs: number;
  status: 'stopped' | 'error';
  endTime: number;
}

export interface TabState {
  tabId: number;
  windowId: number;
  status: Status;
  runName: string | null;
  startTime: number | null;
  elapsedTime: number;
  pausedTime: number;
  pauseStartTime: number | null;
  history: RunHistoryEntry[];
  error: string | null;
  isVisible: boolean; // To control indicator visibility per tab
}

export interface GlobalState {
  [tabId: number]: TabState;
}

export interface MessageBase {
  type: string;
}

export interface InitMessage extends MessageBase {
    type: 'init';
    tabId: number;
    state: GlobalState;
}

export interface StateUpdateMessage extends MessageBase {
    type: 'stateUpdate';
    state: GlobalState;
}

export interface StartRunMessage extends MessageBase {
    type: 'startRun';
    runName: string | null;
}

export interface StopRunMessage extends MessageBase {
    type: 'stopRun';
    isError?: boolean;
    error?: string;
}

export interface PauseResumeMessage extends MessageBase {
    type: 'pauseResume';
}

export interface CloseIndicatorMessage extends MessageBase {
    type: 'closeIndicator';
}

export interface NavigateToTabMessage extends MessageBase {
    type: 'navigateToTab';
    tabId: number;
    windowId: number;
}

export interface ErrorMessage extends MessageBase {
    type: 'error';
    error: string;
}


// Union type for messages
export type Message =
  | InitMessage
  | StateUpdateMessage
  | StartRunMessage
  | StopRunMessage
  | PauseResumeMessage
  | CloseIndicatorMessage
  | NavigateToTabMessage
  | ErrorMessage;


export interface NotificationContext {
  tabId: number;
  windowId: number;
  durationMs?: number | null;
  runName?: string | null;
}

export interface IndicatorProps {
  currentTabState: TabState;
  allTabsState: GlobalState;
  onPauseResume: () => void;
  onClose: () => void;
  onNavigate: (tabId: number, windowId: number) => void;
}
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
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useMovable } from './useMovable';
import { statusConfig } from './constants';
import type { IndicatorProps, RunHistoryEntry, TabState } from '../types';

function formatElapsedTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}

function HistoryEntry({
  entry,
  onNavigate,
}: {
  entry: RunHistoryEntry;
  onNavigate: () => void;
}) {
  return (
    <button
      className="flex items-center justify-between text-xs w-full px-2 py-1 hover:bg-white/10 rounded text-left"
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`truncate font-mono ${
            entry.status === 'stopped' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {new Date(entry.endTime).toLocaleString(undefined, {
            year: '2-digit',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <span className="font-mono text-gray-400 pl-2">
        {formatElapsedTime(entry.durationMs)}
      </span>
    </button>
  );
}

const SIDEBAR_WIDTH_STORAGE_KEY = 'indicator-sidebar-width';
const MIN_SIDEBAR_WIDTH = 100;
const MIN_CONTENT_WIDTH = 200;

function Indicator({
  currentTabState,
  allTabsState,
  onPauseResume,
  onClose,
  onNavigate,
}: IndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTabIdForHistory, setSelectedTabIdForHistory] =
    useState<number | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(160);

  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    chrome.storage.local.get(SIDEBAR_WIDTH_STORAGE_KEY, (result) => {
      if (
        result[SIDEBAR_WIDTH_STORAGE_KEY] &&
        typeof result[SIDEBAR_WIDTH_STORAGE_KEY] === 'number'
      ) {
        setSidebarWidth(result[SIDEBAR_WIDTH_STORAGE_KEY]);
      }
    });
  }, []);

  const historyTabs = useMemo<TabState[]>(
    () =>
      Object.values(allTabsState)
        .filter((tab) => tab.history.length > 0)
        .sort((a, b) => {
          const aLast = a.history[0]?.endTime ?? 0;
          const bLast = b.history[0]?.endTime ?? 0;
          return bLast - aLast;
        }),
    [allTabsState]
  );

  useEffect(() => {
    if (isExpanded) {
      const isSelectionValid = historyTabs.some(
        (t) => t.tabId === selectedTabIdForHistory
      );

      if (!isSelectionValid) {
        if (historyTabs.find((t) => t.tabId === currentTabState.tabId)) {
          setSelectedTabIdForHistory(currentTabState.tabId);
        } else if (historyTabs.length > 0) {
          setSelectedTabIdForHistory(historyTabs[0].tabId);
        } else {
          // No history, so collapse
          setIsExpanded(false);
        }
      }
    } else {
      setSelectedTabIdForHistory(null);
    }
  }, [isExpanded, historyTabs, currentTabState.tabId, selectedTabIdForHistory]);

  const handleToggleExpand = useCallback(() => {
    // Only allow expanding if there is history to show
    if (historyTabs.length > 0) {
      setIsExpanded((expanded) => !expanded);
    }
  }, [historyTabs]);

  const { position, size, handleMouseDown, handleMouseMoveForCursor } =
    useMovable(indicatorRef, {
      onDragHandleClick: handleToggleExpand,
      isResizable: isExpanded,
      dragHandleClassName: 'drag-handle',
      initialSize: { width: 550, height: 400 },
      minSize: {
        width: MIN_SIDEBAR_WIDTH + MIN_CONTENT_WIDTH + 6, // 6px for resizer
        height: 250,
      },
    });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleMouseDownResizeSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const totalWidth =
        indicatorRef.current?.getBoundingClientRect().width ?? 0;
      const dx = moveEvent.clientX - startX;
      let newWidth = startWidth + dx;

      if (newWidth < MIN_SIDEBAR_WIDTH) {
        newWidth = MIN_SIDEBAR_WIDTH;
      }
      if (totalWidth && newWidth > totalWidth - MIN_CONTENT_WIDTH - 6) {
        // 6px for resizer
        newWidth = totalWidth - MIN_CONTENT_WIDTH - 6;
      }
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      chrome.storage.local.set({
        [SIDEBAR_WIDTH_STORAGE_KEY]: sidebarWidthRef.current,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    // Preload audio element when component mounts
    const soundUrl = chrome.runtime.getURL('notification.mp3');
    audioRef.current = new Audio(soundUrl);
  }, []);

  useEffect(() => {
    if (currentTabState?.status === 'stopped') {
      audioRef.current
        ?.play()
        .catch((err) => console.error('Audio play failed: ', err));
    }
  }, [currentTabState?.status]);

  if (!currentTabState) {
    return null;
  }

  const config = statusConfig[currentTabState.status];
  const isPausable =
    currentTabState.status === 'running' ||
    currentTabState.status === 'paused' ||
    currentTabState.status === 'monitoring';

  const totalRuns = historyTabs.reduce(
    (sum, tab) => sum + tab.history.length,
    0
  );
  const totalDuration = historyTabs.reduce(
    (sum: number, tab: TabState) =>
      sum +
      tab.history.reduce(
        (tabSum: number, run: RunHistoryEntry) => tabSum + run.durationMs,
        0
      ),
    0
  );
  const avgDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;

  return (
    <div
      ref={indicatorRef}
      className="fixed top-0 left-0 z-[99999] rounded-lg shadow-lg text-white font-sans select-none flex flex-col"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(4px)',
        width: isExpanded ? `${size.width}px` : '256px',
        height: isExpanded ? `${size.height}px` : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMoveForCursor}
    >
      <div className="drag-handle flex items-center gap-3 p-2 cursor-grab flex-shrink-0">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              config.bgColor
            } ${config.animate ? 'animate-pulse' : ''}`}
          ></span>
          <span className="text-sm font-medium truncate">
            {currentTabState.runName
              ? currentTabState.runName
              : config.text}
          </span>
          {(currentTabState.status === 'running' ||
            currentTabState.status === 'paused' ||
            currentTabState.status === 'stopped') && (
            <span className="text-sm font-mono text-gray-300">
              {formatElapsedTime(currentTabState.elapsedTime)}
            </span>
          )}
        </div>
        <div className="flex items-center flex-shrink-0">
          {isPausable && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onPauseResume}
              className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
              title={currentTabState.status === 'paused' ? 'Resume' : 'Pause'}
            >
              {currentTabState.status === 'running' ||
              currentTabState.status === 'monitoring' ? (
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
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
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
      {currentTabState.status === 'error' && currentTabState.error && (
        <p className="text-xs text-red-400 px-2 pb-2 -mt-1">
          {currentTabState.error}
        </p>
      )}

      {/* Expanded History View */}
      {isExpanded && (
        <>
          <div className="flex-grow flex border-t border-white/20 min-h-0">
            {/* Sidebar */}
            <div
              className="overflow-y-auto flex-shrink-0 flex flex-col py-1"
              style={{ width: `${sidebarWidth}px` }}
            >
              {historyTabs.map((tab) => {
                const tabDisplayName =
                  tab.history[0]?.runName || `Tab ${tab.tabId}`;
                const isSelected = selectedTabIdForHistory === tab.tabId;
                return (
                  <button
                    key={tab.tabId}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        onNavigate(tab.tabId, tab.windowId);
                        e.preventDefault();
                      } else {
                        setSelectedTabIdForHistory(tab.tabId);
                      }
                    }}
                    className={`w-full text-left p-2 text-xs ${
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    title={`${tabDisplayName}\n(Ctrl+Click to go to tab)`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-200">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          statusConfig[tab.status].bgColor
                        } ${
                          statusConfig[tab.status].animate
                            ? 'animate-pulse'
                            : ''
                        }`}
                      ></span>
                      <span className="truncate">{tabDisplayName}</span>
                    </div>
                    <div className="text-gray-400 pl-4">
                      {tab.history.length} run
                      {tab.history.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resizer */}
            <div
              onMouseDown={handleMouseDownResizeSidebar}
              className="w-1.5 flex-shrink-0 cursor-col-resize bg-white/10 hover:bg-white/20 transition-colors"
            ></div>

            {/* Main Content */}
            <div className="flex-grow overflow-y-auto">
              {(() => {
                const selectedTabData = selectedTabIdForHistory
                  ? allTabsState[selectedTabIdForHistory]
                  : null;

                if (!selectedTabData) {
                  return (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Select a tab to view its history.
                    </p>
                  );
                }

                return (
                  <div className="flex flex-col gap-0.5 p-2">
                    {selectedTabData.history.map((entry) => (
                      <HistoryEntry
                        key={entry.id}
                        entry={entry}
                        onNavigate={() =>
                          onNavigate(
                            selectedTabData.tabId,
                            selectedTabData.windowId
                          )
                        }
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          {historyTabs.length > 0 ? (
            <div className="flex-shrink-0 text-xs text-gray-400 px-3 py-1.5 border-t border-white/20 flex justify-between">
              <span>
                Total Runs:{' '}
                <span className="font-medium text-gray-300">{totalRuns}</span>
              </span>
              <span>
                Avg:{' '}
                <span className="font-mono font-medium text-gray-300">
                  {formatElapsedTime(avgDuration)}
                </span>
              </span>
            </div>
          ) : null}
        </>
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
import type { GlobalState } from '../types';

/**
 * Captures the current tab's title to use as the run name.
 * This makes notifications more informative.
 * @returns The tab's title, or null if it's empty.
 */
function captureRunContext(): string | null {
  try {
    const title = document.title?.trim();
    if (title) {
      // Clean up the title, e.g., remove " - Google AI Studio"
      return title.replace(/ - Google AI Studio$/, '').trim();
    }
  } catch (e) {
    console.error(
      'AI Studio Notifier: Error capturing run context from tab title.',
      e
    );
  }
  return null;
}

function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [globalState, setGlobalState] = useState<GlobalState>({});
  const lastKnownStopButtonState = useRef<boolean>(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    portRef.current = chrome.runtime.connect({ name: 'content-script' });

    portRef.current.onMessage.addListener((message: any) => {
      if (message.type === 'init') {
        setTabId(message.tabId);
        setGlobalState(message.state);
      } else if (message.type === 'stateUpdate') {
        setGlobalState(message.state);
      }
    });

    const port = portRef.current;
    return () => {
      port.disconnect();
      portRef.current = null;
    };
  }, []);

  const postMessage = useCallback((message: any) => {
    try {
      if (portRef.current) {
        portRef.current.postMessage(message);
      }
    } catch (e) {
      console.warn('Could not post message, port may be disconnected.', e);
    }
  }, []);

  const checkState = useCallback(() => {
    if (!tabId) return;
    const currentTabState = globalState[tabId];
    if (!currentTabState || currentTabState.status === 'paused') {
      return;
    }

    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );
      if (stopButtonExists !== lastKnownStopButtonState.current) {
        lastKnownStopButtonState.current = stopButtonExists;
        if (stopButtonExists) {
          postMessage({ type: 'startRun', runName: captureRunContext() });
        } else {
          postMessage({ type: 'stopRun' });
        }
      }
    } catch (e) {
      console.error('AI Studio Notifier: Error during state check.', e);
      postMessage({ type: 'error', error: 'An error occurred during check.' });
    }
  }, [globalState, tabId, postMessage]);

  useEffect(() => {
    if (!tabId) return;
    const currentTabState = globalState[tabId];
    if (currentTabState?.status === 'paused') {
      return;
    }

    const timeoutId = setTimeout(checkState, 1000);
    const observer = new MutationObserver(checkState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [checkState, tabId, globalState]);

  const handlePauseResume = useCallback(
    () => postMessage({ type: 'pauseResume' }),
    [postMessage]
  );
  const handleClose = useCallback(
    () => postMessage({ type: 'closeIndicator' }),
    [postMessage]
  );
  const handleNavigate = useCallback(
    (navTabId: number, windowId: number) => {
      postMessage({ type: 'navigateToTab', tabId: navTabId, windowId });
    },
    [postMessage]
  );

  if (!tabId || !globalState[tabId]?.isVisible) {
    return null;
  }

  const currentTabState = globalState[tabId];
  if (!currentTabState) return null; // Should not happen if tabId is set

  return (
    <Indicator
      currentTabState={currentTabState}
      allTabsState={globalState}
      onPauseResume={handlePauseResume}
      onClose={handleClose}
      onNavigate={handleNavigate}
    />
  );
}

export default App;
```

## File: src/background.ts
```typescript
import type {
  GlobalState,
  TabState,
  RunHistoryEntry,
  NotificationContext,
  Message,
} from './types';

// --- State Management ---

const STATE_KEY = 'ai-studio-tracker-state';
let state: GlobalState = {};
let timerInterval: number | undefined;
let ports: { [tabId: number]: chrome.runtime.Port } = {};

async function getState(): Promise<GlobalState> {
  const result = await chrome.storage.local.get(STATE_KEY);
  return result[STATE_KEY] || {};
}

async function setState(newState: GlobalState): Promise<void> {
  state = newState;
  await chrome.storage.local.set({ [STATE_KEY]: newState });
  broadcastState();
}

function broadcastState() {
  for (const tabIdStr in ports) {
    const port = ports[tabIdStr];
    try {
      port.postMessage({ type: 'stateUpdate', state: state });
    } catch (e) {
      console.warn(`Could not send state to tab ${tabIdStr}, port is likely closed.`);
    }
  }
}

async function updateTabState<T>(
  tabId: number,
  updater: (tab: TabState) => T
): Promise<T | undefined> {
  const currentState = await getState();
  const tab = currentState[tabId];
  if (!tab) return undefined;

  const result = updater(tab);
  await setState(currentState);
  return result;
}

function getInitialTabState(tabId: number, windowId: number): TabState {
  return {
    tabId,
    windowId,
    status: 'monitoring',
    runName: null,
    startTime: null,
    elapsedTime: 0,
    pausedTime: 0,
    pauseStartTime: null,
    history: [],
    error: null,
    isVisible: true,
  };
}

// --- Timer for Elapsed Time ---

function updateTimers() {
  let needsUpdate = false;
  const now = Date.now();

  for (const tabIdStr in state) {
    const tabId = parseInt(tabIdStr, 10);
    const tab = state[tabId];
    if (tab.status === 'running' && tab.startTime) {
      tab.elapsedTime = now - tab.startTime - tab.pausedTime;
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    state = { ...state };
    broadcastState();
  }

  const anyRunning = Object.values(state).some(
    (t) => t.status === 'running'
  );
  if (!anyRunning && timerInterval) {
    clearInterval(timerInterval);
    timerInterval = undefined;
  }
}

function ensureTimerIsRunning() {
  if (!timerInterval) {
    timerInterval = setInterval(updateTimers, 1000);
  }
}

// --- Port-based Communication ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'content-script' || !port.sender?.tab?.id) {
    return;
  }
  const tabId = port.sender.tab.id;
  const windowId = port.sender.tab.windowId ?? -1;
  ports[tabId] = port;

  port.onMessage.addListener(async (message: Message) => {
    switch (message.type) {
      case 'startRun':
        handleStartRun(tabId, message.runName);
        break;
      case 'stopRun':
        handleStopRun(tabId, message.isError, message.error);
        break;
      case 'pauseResume':
        handlePauseResume(tabId);
        break;
      case 'closeIndicator':
        handleCloseIndicator(tabId);
        break;
      case 'navigateToTab':
        handleNavigateToTab(message.tabId, message.windowId);
        break;
      case 'error':
        updateTabState(tabId, (tab) => {
          tab.status = 'error';
          tab.error = message.error;
        });
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    delete ports[tabId];
    console.log(`Port disconnected for tab ${tabId}`);
  });

  // Handle initial connection
  (async () => {
    let currentState = await getState();
    if (!currentState[tabId]) {
      currentState[tabId] = getInitialTabState(tabId, windowId);
    } else {
      currentState[tabId].isVisible = true; // Make visible on reconnect
      currentState[tabId].windowId = windowId;
    }
    await setState(currentState);
    currentState = await getState(); // Re-read state after setState
    port.postMessage({
      type: 'init',
      tabId: tabId,
      state: currentState,
    });
  })();
});


async function handleStartRun(tabId: number, runName: string | null) {
  await updateTabState(tabId, (tab) => {
    // Prevent resetting a run that the content script thinks has started again
    // on page load.
    if (tab.status === 'running') return;

    tab.status = 'running';
    tab.startTime = Date.now();
    tab.runName = runName;
    tab.elapsedTime = 0;
    tab.pausedTime = 0;
    tab.pauseStartTime = null;
    tab.error = null;

    ensureTimerIsRunning();
  });
}

async function handleStopRun(
  tabId: number,
  isError = false,
  error?: string
) {
  const notificationContext = await updateTabState(tabId, (tab) => {
    if (tab.status === 'monitoring' || tab.status === 'stopped') return null;

    const endTime = Date.now();
    const finalElapsedTime = tab.startTime
      ? endTime - tab.startTime - tab.pausedTime
      : 0;
    const finalStatus = isError ? 'error' : 'stopped';

    const historyEntry: RunHistoryEntry = {
      id: `${tabId}-${endTime}`,
      runName: tab.runName,
      durationMs: finalElapsedTime,
      status: finalStatus,
      endTime: endTime,
    };
    tab.history.unshift(historyEntry);
    if (tab.history.length > 20) {
      tab.history.pop();
    }

    tab.status = 'stopped';
    tab.startTime = null;
    // tab.runName is preserved for the "stopped" message
    tab.elapsedTime = finalElapsedTime;
    tab.error = error || null;

    // After 5s, reset to monitoring to make it clear we're ready for the next run.
    if (!isError) {
      setTimeout(async () => {
        const freshState = await getState();
        const freshTab = freshState[tabId];
        // Make sure we don't reset if a new run has already started.
        if (
          freshTab &&
          freshTab.status === 'stopped' &&
          freshTab.history[0]?.id === historyEntry.id
        ) {
          freshTab.status = 'monitoring';
          freshTab.runName = null;
          freshTab.elapsedTime = 0;
          freshTab.error = null;
          await setState(freshState);
        }
      }, 5000);
    }

    if (finalElapsedTime >= 3000) {
      return {
        tabId: tab.tabId,
        windowId: tab.windowId,
        durationMs: finalElapsedTime,
        runName: historyEntry.runName,
      };
    }
    return null;
  });

  if (notificationContext) {
    createNotification(notificationContext);
  }
}

async function handlePauseResume(tabId: number) {
  await updateTabState(tabId, (tab) => {
    if (tab.status === 'running') {
      tab.pauseStartTime = Date.now();
      tab.status = 'paused';
      // Update elapsed time one last time before pausing interval
      if (tab.startTime) {
        tab.elapsedTime = Date.now() - tab.startTime - tab.pausedTime;
      }
    } else if (tab.status === 'paused') {
      if (tab.pauseStartTime) {
        tab.pausedTime += Date.now() - tab.pauseStartTime;
      }
      tab.pauseStartTime = null;
      tab.status = 'running';
      ensureTimerIsRunning();
    }
  });
}

async function handleCloseIndicator(tabId: number) {
  updateTabState(tabId, (tab) => {
    tab.isVisible = false;
  });
}

function handleNavigateToTab(tabId: number, windowId: number) {
  chrome.windows.update(windowId, { focused: true });
  chrome.tabs.update(tabId, { active: true });
}

// --- Tab Lifecycle Management ---

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const currentState = await getState();
  if (currentState[tabId]) {
    delete currentState[tabId];
    await setState(currentState);
  }
});


// --- Notification Logic ---

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) {
    return '';
  }
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
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: 'icon128.png',
      title: title,
      message: message,
      priority: 2,
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

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const storageKey = `notification:${notificationId}`;
  const data = await chrome.storage.local.get(storageKey);
  const context = data[storageKey] as NotificationContext | undefined;

  if (!context) {
    console.warn(`No context found for clicked notification: ${notificationId}`);
    return;
  }

  handleNavigateToTab(context.tabId, context.windowId);
  chrome.notifications.clear(notificationId);
});

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
          await chrome.storage.local.set({ [alarmName]: context });
          chrome.alarms.create(alarmName, { delayInMinutes: 5 });
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

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('remind-')) {
    const data = await chrome.storage.local.get(alarm.name);
    const context = data[alarm.name] as NotificationContext | undefined;

    if (context) {
      console.log(`Re-creating notification from alarm: ${alarm.name}`);
      createNotification(context);
      await chrome.storage.local.remove(alarm.name);
    }
  }
});

// --- Service Worker Startup ---
(async () => {
  state = await getState();
  console.log('AI Studio Notifier: Background state loaded.');

  const tabs = await chrome.tabs.query({});
  const existingTabIds = new Set(tabs.map((t) => t.id).filter(Boolean));
  const stateTabIds = Object.keys(state).map(Number);
  let stateChanged = false;

  for (const tabId of stateTabIds) {
    if (!existingTabIds.has(tabId)) {
      delete state[tabId];
      stateChanged = true;
    }
  }

  if (stateChanged) {
    await setState(state);
  }

  if (Object.values(state).some((t) => t.status === 'running')) {
    ensureTimerIsRunning();
  }
})();
```
