document.addEventListener('DOMContentLoaded', () => {
  const currentDomainEl = document.getElementById('current-domain');
  const currentCategoryEl = document.getElementById('current-category');
  const currentTimeEl = document.getElementById('current-time');
  const openDashboardBtn = document.getElementById('open-dashboard');
  const openOptionsBtn = document.getElementById('open-options');

  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const domain = extractDomain(tabs[0].url);
      currentDomainEl.textContent = domain;
      
      chrome.storage.sync.get(['categorizedSites'], (result) => {
        const category = getCategory(domain, result.categorizedSites || {});
        currentCategoryEl.textContent = category;
        currentCategoryEl.className = category;
      });
    }
  });

  // Update time spent every second
  setInterval(() => {
    chrome.storage.local.get(['timeData'], (result) => {
      const today = new Date().toISOString().split('T')[0];
      const timeData = result.timeData || {};
      const dayData = timeData[today] || {};
      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          const domain = extractDomain(tabs[0].url);
          const timeSpent = dayData[domain] || 0;
          currentTimeEl.textContent = formatTime(timeSpent);
        }
      });
    });
  }, 1000);

  // Button event listeners
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Helper functions (same as in background.js)
  function extractDomain(url) { /* ... */ }
  function getCategory(domain, categorizedSites) { /* ... */ }
  function formatTime(seconds) { /* ... */ }
});