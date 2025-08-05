import { useRef, useEffect, useState } from 'react';
import { useDrag } from './useDrag';
import { statusConfig } from './constants';
import type { IndicatorProps } from './types';

function formatElapsedTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}

function Indicator({
  status,
  error,
  elapsedTime,
  onPauseResume,
  runName,
}: IndicatorProps) {
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
  const isPausable =
    status === 'running' || status === 'paused' || status === 'monitoring';

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
          {runName && (
            <span className="text-sm font-light text-gray-300 truncate max-w-[150px] pl-1">
              - {runName}
            </span>
          )}
          {(status === 'running' ||
            status === 'paused' ||
            status === 'stopped') && (
            <span className="text-sm font-mono text-gray-300">
              {formatElapsedTime(elapsedTime)}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {isPausable && (
            <button
              onClick={onPauseResume}
              className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
              title={status === 'paused' ? 'Resume' : 'Pause'}
            >
              {status === 'running' || status === 'monitoring' ? (
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
            onClick={() => setIsVisible(false)}
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
      {status === 'error' && error && (
        <p className="text-xs text-red-400 px-2 pb-2 -mt-1">{error}</p>
      )}
    </div>
  );
}

export default Indicator;