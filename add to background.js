// Add to background.js, after the existing code

// Notification system
let notificationTimeout = null;

function checkForNotifications(url, startTime, endTime) {
  chrome.storage.sync.get(['notificationSettings'], (result) => {
    const settings = result.notificationSettings || { enabled: false, timeLimit: 30 };
    if (!settings.enabled) return;
    
    const domain = extractDomain(url);
    const category = getCategory(domain);
    
    if (category === 'unproductive') {
      chrome.storage.local.get(['timeData'], (result) => {
        const timeData = result.timeData || {};
        const today = new Date().toISOString().split('T')[0];
        const dayData = timeData[today] || {};
        const timeSpent = (dayData[domain] || 0) / 60; // in minutes
        
        if (timeSpent >= settings.timeLimit) {
          // Clear any pending notification
          if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
          }
          
          // Show notification immediately if limit is reached
          showNotification(domain, timeSpent);
        } else if (timeSpent >= settings.timeLimit * 0.8) {
          // Schedule notification for when limit will be reached
          const timeRemaining = (settings.timeLimit - timeSpent) * 60 * 1000;
          
          notificationTimeout = setTimeout(() => {
            showNotification(domain, settings.timeLimit);
          }, timeRemaining);
        }
      });
    }
  });
}

function showNotification(domain, minutes) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Time Limit Reached',
    message: `You've spent ${Math.round(minutes)} minutes on ${domain}. Consider taking a break!`,
    buttons: [
      { title: 'Dismiss' }
    ]
  });
}

// Call this function from saveTimeSpent before saving
function saveTimeSpent(url, start, end) {
  // ... existing code ...
  
  checkForNotifications(url, start, end);
  
  // ... rest of existing code ...
}