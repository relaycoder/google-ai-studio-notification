// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'processFinished') {
    console.log('Background script received processFinished message.');

    // Create a desktop notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon128.png', // An icon is required for basic notifications
      title: 'AI Studio',
      message: 'Your process has finished!',
      priority: 2, // High priority
    });
  }
});
