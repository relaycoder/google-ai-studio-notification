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