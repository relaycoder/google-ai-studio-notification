import { useState, useEffect, useCallback, useRef } from 'react';
import Indicator from './Indicator';
import type { Status } from './types';

/**
 * Attempts to capture a short summary of the current prompt from the UI.
 * This makes notifications more informative.
 * @returns A string summary of the prompt, or null if not found.
 */
function captureRunContext(): string | null {
  try {
    // This selector targets the rich text editor area where the user types the prompt.
    // It is based on observed patterns in modern web apps and may need adjustment
    // for future AI Studio versions. We look for the last one on the page,
    // assuming it's the active one for the current or upcoming run.
    const promptElements = document.querySelectorAll(
      'div[contenteditable="true"][aria-multiline="true"]'
    );
    if (promptElements.length > 0) {
      const promptElement = promptElements[promptElements.length - 1];
      const text = promptElement.textContent?.trim();
      if (text) {
        // Create a short summary of the prompt
        const summary = text.split(/\s+/).slice(0, 7).join(' ');
        return text.length > summary.length ? `${summary}...` : summary;
      }
    }
  } catch (e) {
    console.error('AI Studio Notifier: Error capturing run context.', e);
  }
  return null;
}

function App() {
  const [status, setStatus] = useState<Status>('monitoring');
  const [error, setError] = useState<string | null>(null);
  const [runName, setRunName] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const prePauseStatusRef = useRef<Status>('monitoring');

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
      if (currentStatus === 'running' || currentStatus === 'monitoring') {
        // Pausing
        prePauseStatusRef.current = currentStatus; // Store where we came from

        if (currentStatus === 'running') {
          pauseStartRef.current = Date.now();
          // Update elapsed time one last time before pausing interval
          if (startTimeRef.current) {
            setElapsedTime(
              Date.now() - startTimeRef.current - pausedTimeRef.current
            );
          }
        }
        return 'paused';
      }

      if (currentStatus === 'paused') {
        // Resuming
        const resumeTo = prePauseStatusRef.current;
        if (resumeTo === 'running') {
          if (pauseStartRef.current) {
            pausedTimeRef.current += Date.now() - pauseStartRef.current;
            pauseStartRef.current = null;
          }
        }
        // Resume to the state we were in before pausing
        return resumeTo;
      }

      return currentStatus;
    });
  }, []);

  const checkState = useCallback(() => {
    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );

      // Don't do anything if paused. The pause/resume button is the only source of truth.
      if (status === 'paused') {
        return;
      }

      const wasRunning = status === 'running';

      // --- Transition: running -> stopped ---
      if (wasRunning && !stopButtonExists) {
        const endTime = Date.now();
        const finalElapsedTime = startTimeRef.current
          ? endTime - startTimeRef.current - pausedTimeRef.current
          : 0;
        setElapsedTime(finalElapsedTime < 0 ? 0 : finalElapsedTime);

        if (finalElapsedTime >= 3000) {
          console.log(
            `AI Studio process finished. Sending desktop notification for run: "${runName}".`
          );
          chrome.runtime.sendMessage({
            type: 'processFinished',
            durationMs: finalElapsedTime,
            runName: runName,
          });
        } else {
          console.log(
            'AI Studio process finished in under 3 seconds. Skipping desktop notification.'
          );
        }

        startTimeRef.current = null;
        pausedTimeRef.current = 0;
        pauseStartRef.current = null;
        setStatus('stopped');
        return; // End execution for this check
      }

      const newStatus = stopButtonExists ? 'running' : 'monitoring';

      // No state change, do nothing.
      if (newStatus === status) {
        return;
      }

      // --- Transition: stopped -> monitoring ---
      // This happens when the user clears the output. We want to stay in the 'stopped'
      // state visually until a new run is explicitly started.
      if (status === 'stopped' && newStatus === 'monitoring') {
        // We reset the run name here so the indicator clears.
        if (runName) setRunName(null);
        return;
      }

      // --- Transition: (monitoring | stopped) -> running ---
      if (newStatus === 'running') {
        // This covers transitions from 'monitoring' or 'stopped' to 'running'
        console.log('AI Studio Notifier: State changed to Running');
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        pauseStartRef.current = null;
        setElapsedTime(0);
        setRunName(captureRunContext());
        setStatus('running');
        setError(null);
        return;
      }

      // --- Any other transition (e.g., running -> monitoring, which shouldn't happen) ---
      console.log(`AI Studio Notifier: State changed to ${newStatus}`);
      setStatus(newStatus);
      setError(null);
    } catch (e) {
      console.error('AI Studio Notifier: Error during state check.', e);
      setError('An error occurred during check.');
      setStatus('error');
    }
  }, [status, runName]);

  useEffect(() => {
    // When paused, the observer should not be active to save resources.
    if (status === 'paused') {
      // The cleanup function of the previous effect run has already disconnected
      // the observer. We don't set up a new one while paused.
      return;
    }

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
      console.log('AI Studio Notifier: MutationObserver disconnected.');
    };
  }, [checkState, status]);

  return (
    <Indicator
      status={status}
      error={error}
      elapsedTime={elapsedTime}
      onPauseResume={handlePauseResume}
      runName={runName}
    />
  );
}

export default App;