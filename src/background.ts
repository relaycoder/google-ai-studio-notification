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
let lastActiveTabId: number | null = null;
let isWindowFocused = true; // Assume focused at startup

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

// --- Standby Logic for Inactive Tabs ---

async function updateStandbyStates() {
  const currentState = await getState();
  let changed = false;
  for (const tabIdStr in currentState) {
    const tabId = parseInt(tabIdStr, 10);
    const tab = currentState[tabId];
    if (tab.status === 'monitoring' || tab.status === 'standby') {
      const shouldBeActive = isWindowFocused && tabId === lastActiveTabId;
      if (shouldBeActive && tab.status === 'standby') {
        tab.status = 'monitoring';
        changed = true;
      } else if (!shouldBeActive && tab.status === 'monitoring') {
        tab.status = 'standby';
        changed = true;
      }
    }
  }
  if (changed) {
    await setState(currentState);
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  lastActiveTabId = activeInfo.tabId;
  const window = await chrome.windows.get(activeInfo.windowId);
  isWindowFocused = window.focused;
  await updateStandbyStates();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  if (isWindowFocused) {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab?.id) {
      lastActiveTabId = activeTab.id;
    }
  }
  await updateStandbyStates();
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

  // Set initial focus and active tab for standby logic
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    const lastFocusedWindow = await chrome.windows.getLastFocused();
    isWindowFocused = lastFocusedWindow?.focused ?? true;
    lastActiveTabId = activeTab?.id ?? null;
  } catch (e) {
    console.warn('Could not determine active tab at startup.');
  }

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

  await updateStandbyStates();
})();