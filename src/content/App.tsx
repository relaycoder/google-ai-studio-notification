import { useState, useEffect, useCallback } from 'react';
import Indicator from './Indicator';

export type Status = 'monitoring' | 'running' | 'stopped' | 'error';

function App() {
  const [status, setStatus] = useState<Status>('monitoring');
  const [error, setError] = useState<string | null>(null);

  const checkState = useCallback(() => {
    try {
      const stopButtonExists = !!document.querySelector<SVGRectElement>(
        'rect[class*="stoppable-stop"]'
      );

      setStatus((prevStatus) => {
        const wasRunning = prevStatus === 'running';
        if (wasRunning && !stopButtonExists) {
          // State transition: running -> stopped
          console.log(
            'AI Studio process finished. Playing sound and sending desktop notification.'
          );
          chrome.runtime.sendMessage({ type: 'processFinished' });
          return 'stopped';
        }

        const newStatus = stopButtonExists ? 'running' : 'monitoring';
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
  }, []);

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

  return <Indicator status={status} error={error} />;
}

export default App;