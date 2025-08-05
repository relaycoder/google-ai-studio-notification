export interface NotificationContext {
  tabId: number;
  windowId: number;
  durationMs?: number | null;
  runName?: string | null;
}