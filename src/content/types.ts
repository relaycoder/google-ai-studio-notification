export type Status = 'monitoring' | 'running' | 'stopped' | 'error' | 'paused';

export interface IndicatorProps {
  status: Status;
  error: string | null;
  elapsedTime: number;
  onPauseResume: () => void;
  runName: string | null;
}