let activeTab = null;
let startTime = null;
let categorizedSites = {};

// Load categorized sites from storage
chrome.storage.sync.get(['categorizedSites'], (result) => {
  if (result.categorizedSites) {
    categorizedSites = result.categorizedSites;
  } else {
    // Default categories
    categorizedSites = {
      'productive': ['github.com', 'stackoverflow.com', 'developer.mozilla.org'],
      'unproductive': ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com'],
      'neutral': ['google.com', 'wikipedia.org']
    };
    chrome.storage.sync.set({ categorizedSites });
  }
});

// Track tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (activeTab) {
      saveTimeSpent(activeTab.url, startTime, Date.now());
    }
    activeTab = tab;
    startTime = Date.now();
  });
});

// Track URL changes in the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (activeTab && activeTab.id === tabId && changeInfo.url) {
    saveTimeSpent(activeTab.url, startTime, Date.now());
    activeTab = tab;
    startTime = Date.now();
  }
});

// Track when window loses focus (user switches to another app)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE && activeTab) {
    saveTimeSpent(activeTab.url, startTime, Date.now());
    activeTab = null;
    startTime = null;
  }
});

// Save time spent to storage
function saveTimeSpent(url, start, end) {
  if (!url || !start || !end) return;
  
  const domain = extractDomain(url);
  const category = getCategory(domain);
  const duration = (end - start) / 1000; // in seconds
  
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(['timeData'], (result) => {
    const timeData = result.timeData || {};
    const dayData = timeData[today] || {};
    
    // Update domain time
    dayData[domain] = (dayData[domain] || 0) + duration;
    
    // Update category time
    dayData[category] = (dayData[category] || 0) + duration;
    
    timeData[today] = dayData;
    chrome.storage.local.set({ timeData });
  });
}

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.startsWith('www.') ? domain.substring(4) : domain;
  } catch {
    return '';
  }
}

// Helper function to categorize a domain
function getCategory(domain) {
  for (const [category, sites] of Object.entries(categorizedSites)) {
    if (sites.some(site => domain.includes(site))) {
      return category;
    }
  }
  return 'uncategorized';
}