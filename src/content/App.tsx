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

  // This function will be responsible for ensuring a connection exists.
  const ensureConnection = useCallback(() => {
    if (portRef.current) {
      return;
    }

    try {
      portRef.current = chrome.runtime.connect({ name: 'content-script' });

      // Handle disconnection
      portRef.current.onDisconnect.addListener(() => {
        portRef.current = null;
        console.log(
          'AI Studio Notifier: Port disconnected. It will be reconnected on the next action.'
        );
      });

      // Handle incoming messages
      portRef.current.onMessage.addListener((message: any) => {
        if (message.type === 'init') {
          setTabId(message.tabId);
          setGlobalState(message.state);
        } else if (message.type === 'stateUpdate') {
          setGlobalState(message.state);
        }
      });
    } catch (e) {
      console.error(
        'AI Studio Notifier: Connection to background script failed:',
        e
      );
      portRef.current = null; // Ensure it's null on failure
    }
  }, []);

  useEffect(() => {
    ensureConnection();

    return () => {
      if (portRef.current) {
        portRef.current.disconnect();
        portRef.current = null;
      }
    };
  }, [ensureConnection]);

  const postMessage = useCallback(
    (message: any) => {
      // Ensure connection exists before posting a message.
      ensureConnection();

      if (!portRef.current) {
        console.error(
          'AI Studio Notifier: Cannot post message, port is not connected.'
        );
        return;
      }

      try {
        portRef.current.postMessage(message);
      } catch (e) {
        console.warn(
          'AI Studio Notifier: Could not post message. The port may have been disconnected just now.',
          e
        );
      }
    },
    [ensureConnection]
  );

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