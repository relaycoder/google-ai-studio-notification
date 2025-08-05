import { useRef, useEffect, useState } from 'react';
import { useDrag } from './useDrag';
import type { Status } from './App';

interface IndicatorProps {
  status: Status;
  error: string | null;
}

const statusConfig: Record<Status, { bgColor: string; text: string; animate: boolean }> = {
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
};

function Indicator({ status, error }: IndicatorProps) {
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
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs text-gray-400 hover:text-white cursor-pointer"
          title="Hide Indicator"
        >
          &#x2715;
        </button>
      </div>
      {status === 'error' && error && (
        <p className="text-xs text-red-400 px-2 pb-2 -mt-1">{error}</p>
      )}
    </div>
  );
}

export default Indicator;