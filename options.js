document.addEventListener('DOMContentLoaded', () => {
  let categorizedSites = {
    productive: [],
    unproductive: [],
    neutral: []
  };
  
  // Load saved settings
  chrome.storage.sync.get(['categorizedSites', 'notificationSettings'], (result) => {
    if (result.categorizedSites) {
      categorizedSites = result.categorizedSites;
      updateSiteLists();
    }
    
    if (result.notificationSettings) {
      document.getElementById('enable-notifications').checked = result.notificationSettings.enabled;
      document.getElementById('notification-time-limit').value = result.notificationSettings.timeLimit;
    }
  });
  
  // Add site buttons
  document.getElementById('add-productive-site').addEventListener('click', () => {
    addSite('productive', document.getElementById('new-productive-site').value.trim());
  });
  
  document.getElementById('add-unproductive-site').addEventListener('click', () => {
    addSite('unproductive', document.getElementById('new-unproductive-site').value.trim());
  });
  
  document.getElementById('add-neutral-site').addEventListener('click', () => {
    addSite('neutral', document.getElementById('new-neutral-site').value.trim());
  });
  
  // Allow adding sites with Enter key
  ['new-productive-site', 'new-unproductive-site', 'new-neutral-site'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const category = id.split('-')[1];
        addSite(category, e.target.value.trim());
      }
    });
  });
  
  // Notification settings
  document.getElementById('enable-notifications').addEventListener('change', (e) => {
    saveNotificationSettings();
  });
  
  document.getElementById('notification-time-limit').addEventListener('change', (e) => {
    saveNotificationSettings();
  });
  
  // Data management buttons
  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('import-data').addEventListener('click', importData);
  document.getElementById('clear-data').addEventListener('click', clearData);
  
  function updateSiteLists() {
    ['productive', 'unproductive', 'neutral'].forEach(category => {
      const listElement = document.getElementById(`${category}-sites-list`);
      listElement.innerHTML = '';
      
      categorizedSites[category].forEach(site => {
        const siteElement = document.createElement('div');
        siteElement.className = 'site-item';
        siteElement.innerHTML = `
          <span>${site}</span>
          <button class="remove-site" data-category="${category}" data-site="${site}">×</button>
        `;
        listElement.appendChild(siteElement);
      });
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-site').forEach(button => {
      button.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        const site = e.target.dataset.site;
        removeSite(category, site);
      });
    });
  }
  
  function addSite(category, site) {
    if (!site) return;
    
    // Remove protocol and paths if present
    const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?([^\/]+).*$/, '$3');
    
    if (!categorizedSites[category].includes(cleanSite)) {
      categorizedSites[category].push(cleanSite);
      chrome.storage.sync.set({ categorizedSites }, () => {
        updateSiteLists();
        document.getElementById(`new-${category}-site`).value = '';
      });
    }
  }
  
  function removeSite(category, site) {
    categorizedSites[category] = categorizedSites[category].filter(s => s !== site);
    chrome.storage.sync.set({ categorizedSites }, updateSiteLists);
  }
  
  function saveNotificationSettings() {
    const notificationSettings = {
      enabled: document.getElementById('enable-notifications').checked,
      timeLimit: parseInt(document.getElementById('notification-time-limit').value) || 30
    };
    chrome.storage.sync.set({ notificationSettings });
  }
  
  function exportData() {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: 'time-tracker-data.json',
        saveAs: true
      });
    });
  }
  
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          chrome.storage.local.set(data, () => {
            alert('Data imported successfully!');
          });
        } catch (error) {
          alert('Error importing data: Invalid file format');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }
  
  function clearData() {
    if (confirm('Are you sure you want to clear all your time tracking data? This cannot be undone.')) {
      chrome.storage.local.clear(() => {
        alert('All time tracking data has been cleared.');
      });
    }
  }
});