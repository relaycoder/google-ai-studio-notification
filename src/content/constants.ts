import type { Status, ConnectionStatus } from '../types';

export const STOP_BUTTON_SELECTOR = 'rect[class*="stoppable-stop"]';

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
  standby: {
    bgColor: 'bg-gray-500',
    text: 'Standby',
    animate: false,
  },
};

export const connectionStatusConfig: Record<
  ConnectionStatus,
  { bgColor: string; text: string; animate: boolean }
> = {
  connecting: {
    bgColor: 'bg-yellow-500',
    text: 'Connecting...',
    animate: true,
  },
  connected: {
    // This is a placeholder, as 'connected' status will use the run status config.
    bgColor: '',
    text: '',
    animate: false,
  },
  disconnected: {
    bgColor: 'bg-orange-500',
    text: 'Disconnected. Reconnecting...',
    animate: true,
  },
  invalidated: {
    bgColor: 'bg-red-500',
    text: 'Error: Please reload tab',
    animate: false,
  },
};