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