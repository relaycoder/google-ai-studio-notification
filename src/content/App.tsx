import { useState, useEffect, useCallback, useRef } from 'react';
import Indicator from './Indicator';
import type { Status } from './types';

function App() {
  const [status, setStatus] = useState<Status>('monitoring');
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    let intervalId: number | undefined;

    if (status === 'running') {
      intervalId = window.setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const totalElapsed =
            now - startTimeRef.current - pausedTimeRef.current;
          setElapsedTime(totalElapsed);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status]);

  const handlePauseResume = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus === 'running') {
        // Pausing
        pauseStartRef.current = Date.now();
        // Update elapsed time one last time before pausing interval
        if (startTimeRef.current) {
          setElapsedTime(
            Date.now() - startTimeRef.current - pausedTimeRef.current
          );
        }
        return 'paused';
      }

      if (currentStatus === 'paused') {
        // Resuming
        if (pauseStartRef.current) {
          pausedTimeRef.current += Date.now() - pauseStartRef.current;
          pauseStartRef.current = null;
        }
        return 'running';
      }

      return currentStatus;
    });
  }, []);

  const checkState = useCallback(() => {
    // When paused, we don't check for state changes.
    if (status === 'paused') return;

    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );

      setStatus((prevStatus) => {
        // Prevent checkState from overriding pause
        if (prevStatus === 'paused') return 'paused';

        const wasRunning = prevStatus === 'running';

        if (wasRunning && !stopButtonExists) {
          // State transition: running -> stopped
          const endTime = Date.now();
          const finalElapsedTime = startTimeRef.current
            ? endTime - startTimeRef.current - pausedTimeRef.current
            : 0;
          setElapsedTime(finalElapsedTime < 0 ? 0 : finalElapsedTime);

          if (finalElapsedTime >= 3000) {
            console.log(
              'AI Studio process finished. Sending desktop notification.'
            );
            chrome.runtime.sendMessage({
              type: 'processFinished',
              durationMs: finalElapsedTime,
            });
          } else {
            console.log(
              'AI Studio process finished in under 3 seconds. Skipping desktop notification.'
            );
          }
          startTimeRef.current = null;
          pausedTimeRef.current = 0;
          pauseStartRef.current = null;
          return 'stopped';
        }

        const newStatus = stopButtonExists ? 'running' : 'monitoring';

        if (newStatus === 'running' && prevStatus !== 'running') {
          // State transition: not running -> running
          startTimeRef.current = Date.now();
          pausedTimeRef.current = 0;
          pauseStartRef.current = null;
          setElapsedTime(0);
        }

        if (
          prevStatus !== newStatus &&
          !(prevStatus === 'stopped' && newStatus === 'monitoring')
        ) {
          console.log(
            `AI Studio Notifier: State changed to ${
              stopButtonExists ? 'Running' : 'Monitoring'
            }`
          );
        }
        // If we were stopped, and a new process hasn't started, stay stopped visually
        // until a new run starts.
        if (prevStatus === 'stopped' && !stopButtonExists) {
          return 'stopped';
        }

        return newStatus;
      });
      setError(null);
    } catch (e) {
      console.error('AI Studio Notifier: Error during state check.', e);
      setError('An error occurred during check.');
      setStatus('error');
    }
  }, [status]);

  useEffect(() => {
    // Initial Check after a short delay
    const timeoutId = setTimeout(checkState, 2000);

    // Observer Setup
    const observer = new MutationObserver(checkState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    console.log(
      'AI Studio Notifier: MutationObserver is now watching the page.'
    );

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [checkState]);

  return (
    <Indicator
      status={status}
      error={error}
      elapsedTime={elapsedTime}
      onPauseResume={handlePauseResume}
    />
  );
}

export default App;