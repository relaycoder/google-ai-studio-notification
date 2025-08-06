import { useState, useEffect, useCallback, useRef } from 'react';
import Indicator from './Indicator';
import { sites } from './sites';
import type { GlobalState, ConnectionStatus } from '../types';

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
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const lastKnownStopButtonState = useRef<boolean>(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const [activeSiteSelector, setActiveSiteSelector] = useState<string | null>(
    null
  );

  // This effect detects the active site and handles client-side navigations in SPAs.
  useEffect(() => {
    let lastUrl = '';

    const checkSite = () => {
      if (window.location.href === lastUrl) {
        return;
      }
      lastUrl = window.location.href;

      const matchedSite = sites.find((site) =>
        site.matches.some((pattern) => {
          const regex = new RegExp(
            '^' +
              pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*') +
              '$'
          );
          return regex.test(lastUrl);
        })
      );

      setActiveSiteSelector((prevSelector) => {
        const newSelector = matchedSite ? matchedSite.selector : null;
        return newSelector === prevSelector ? prevSelector : newSelector;
      });
    };

    // Initial check
    checkSite();

    // A MutationObserver is a good way to detect SPA navigations.
    const observer = new MutationObserver(checkSite);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!activeSiteSelector) {
      return; // Do nothing if on an unsupported site.
    }

    let port: chrome.runtime.Port | null = null;
    let isInvalidated = false;
    let reconnectTimeoutId: number | undefined;

    function connect() {
      // Don't try to connect if the context is known to be invalid
      if (isInvalidated) return;
      setConnectionStatus('connecting');

      try {
        // Accessing chrome.runtime.id will throw if context is invalidated
        if (!chrome.runtime?.id) {
          isInvalidated = true;
          setConnectionStatus('invalidated');
          console.error(
            'AI Studio Notifier: Extension context invalidated. Cannot connect.'
          );
          return;
        }

        port = chrome.runtime.connect({ name: 'content-script' });
        portRef.current = port;

        port.onMessage.addListener((message: any) => {
          setConnectionStatus('connected');
          if (message.type === 'init') {
            setTabId(message.tabId);
            setGlobalState(message.state);
          } else if (message.type === 'stateUpdate') {
            setGlobalState(message.state);
          }
        });

        port.onDisconnect.addListener(() => {
          portRef.current = null;
          port = null;
          // If the disconnect was not from an invalidated context, try to reconnect.
          if (chrome.runtime?.id) {
            setConnectionStatus('disconnected');
            console.log(
              'AI Studio Notifier: Port disconnected. Reconnecting in 1s...'
            );
            if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = setTimeout(connect, 1000);
          } else {
            setConnectionStatus('invalidated');
            console.error(
              'AI Studio Notifier: Port disconnected due to invalidated context.'
            );
            isInvalidated = true;
          }
        });
      } catch (e) {
        portRef.current = null;
        port = null;
        console.error(
          'AI Studio Notifier: Connection to background script failed:',
          e
        );
        if (e instanceof Error && e.message.includes('context invalidated')) {
          isInvalidated = true;
          setConnectionStatus('invalidated');
        } else {
          setConnectionStatus('disconnected');
          // Retry connection after a delay if it's not a fatal error
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      // The port object might be from a previous connect attempt, so check it
      if (port) {
        port.disconnect();
      }
      portRef.current = null;
    };
  }, [activeSiteSelector]); // This effect now depends on the site being supported

  const postMessage = useCallback((message: any) => {
    if (!portRef.current) {
      console.error(
        'AI Studio Notifier: Cannot post message, port is not connected. It may be sent after reconnection.'
      );
      return;
    }

    try {
      portRef.current.postMessage(message);
    } catch (e) {
      console.warn(
        'AI Studio Notifier: Could not post message. The port was likely disconnected just now.',
        e
      );
      // The onDisconnect listener will handle reconnection.
    }
  }, []);

  const checkState = useCallback(() => {
    if (!tabId || !activeSiteSelector) return;
    const currentTabState = globalState[tabId];
    if (
      !currentTabState ||
      currentTabState.status === 'paused' ||
      currentTabState.status === 'standby'
    ) {
      return;
    }

    try {
      const stopButtonExists = !!document.querySelector(activeSiteSelector);
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
  }, [globalState, tabId, postMessage, activeSiteSelector]);

  useEffect(() => {
    // Do not run observer if the site is not supported, or tabId is not yet known.
    if (!tabId || !activeSiteSelector) return;

    const currentTabState = globalState[tabId];
    if (
      currentTabState?.status === 'paused' ||
      currentTabState?.status === 'standby'
    ) {
      return;
    }

    const timeoutId = setTimeout(checkState, 1000);
    const observer = new MutationObserver(checkState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [checkState, tabId, globalState, activeSiteSelector]);

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

  if (!activeSiteSelector || !tabId || !globalState[tabId]?.isVisible) {
    return null;
  }

  const currentTabState = globalState[tabId];
  if (!currentTabState) return null; // Should not happen if tabId is set

  return (
    <Indicator
      currentTabState={currentTabState}
      allTabsState={globalState}
      connectionStatus={connectionStatus}
      onPauseResume={handlePauseResume}
      onClose={handleClose}
      onNavigate={handleNavigate}
    />
  );
}

export default App;