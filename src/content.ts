let isRunning = false;

function init() {
  console.log('AI Studio Notifier initializing...');
  // --- Sound Setup ---
  // Note: You must add a 'notification.mp3' file to the extension's root directory.
  const soundUrl = chrome.runtime.getURL('assets/notification.mp3');
  const audio = new Audio(soundUrl);

  function playSound() {
    audio
      .play()
      .catch((error) =>
        console.error(
          'Audio play failed. Make sure notification.mp3 exists and is valid.',
          error
        )
      );
  }

  // --- State Checking Logic ---
  function checkForStopButton() {
    // The user identified an element with class "stoppable-stop" as the indicator.
    // This selector looks for a <rect> element whose class list contains "stoppable-stop".
    // Using [class*="..."] makes it robust against other dynamic classes added by the framework.
    return document.querySelector<SVGRectElement>(
      'rect[class*="stoppable-stop"]'
    );
  }

  function checkState() {
    const stopButtonExists = !!checkForStopButton();

    if (isRunning && !stopButtonExists) {
      // This is the transition we're looking for:
      // State 1 (running, button exists) to State 2 (stopped, button absent).
      console.log(
        'AI Studio process finished. Playing sound and sending desktop notification.'
      );
      playSound();
      // Send a message to the background script to show a desktop notification
      chrome.runtime.sendMessage({ type: 'processFinished' });
    }

    // Update the current state for the next check.
    if (isRunning !== stopButtonExists) {
      console.log(
        `AI Studio Notifier: State changed to ${stopButtonExists ? 'Running' : 'Stopped'
        }`
      );
      isRunning = stopButtonExists;
    }
  }

  // --- Observer Setup ---
  const observer = new MutationObserver(() => {
    // A DOM change occurred, let's re-evaluate the state.
    checkState();
  });

  // We start observing the entire body for changes in its descendants.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log(
    'AI Studio Notifier: MutationObserver is now watching the page for changes.'
  );

  // --- Initial Check ---
  // A short delay helps ensure the page's dynamic content has loaded.
  setTimeout(checkState, 2000);
}

// The script might be injected before the body is fully available.
if (document.body) {
  init();
} else {
  // If not, wait for it.
  window.addEventListener('DOMContentLoaded', init);
}
