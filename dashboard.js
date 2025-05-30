document.addEventListener('DOMContentLoaded', () => {
  let timeChart;
  let currentPeriod = 'week'; // 'day', 'week', or 'month'
  
  // Initialize the dashboard
  initDashboard();
  
  // Period selector event listeners
  document.getElementById('today-btn').addEventListener('click', () => {
    currentPeriod = 'day';
    updateDashboard();
  });
  
  document.getElementById('week-btn').addEventListener('click', () => {
    currentPeriod = 'week';
    updateDashboard();
  });
  
  document.getElementById('month-btn').addEventListener('click', () => {
    currentPeriod = 'month';
    updateDashboard();
  });
  
  // Generate report button
  document.getElementById('generate-report').addEventListener('click', generateWeeklyReport);
  
  function initDashboard() {
    createTimeChart();
    updateDashboard();
  }
  
  function createTimeChart() {
    const ctx = document.getElementById('timeChart').getContext('2d');
    timeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Productive',
            backgroundColor: '#4CAF50',
            data: []
          },
          {
            label: 'Unproductive',
            backgroundColor: '#F44336',
            data: []
          },
          {
            label: 'Neutral',
            backgroundColor: '#9E9E9E',
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { 
            stacked: true,
            title: {
              display: true,
              text: 'Time (hours)'
            }
          }
        }
      }
    });
  }
  
  function updateDashboard() {
    chrome.storage.local.get(['timeData'], (result) => {
      const timeData = result.timeData || {};
      let filteredData = {};
      
      if (currentPeriod === 'day') {
        const today = new Date().toISOString().split('T')[0];
        filteredData[today] = timeData[today] || {};
      } else if (currentPeriod === 'week') {
        // Get data for the last 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          if (timeData[dateStr]) {
            filteredData[dateStr] = timeData[dateStr];
          }
        }
      } else if (currentPeriod === 'month') {
        // Get data for the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          if (timeData[dateStr]) {
            filteredData[dateStr] = timeData[dateStr];
          }
        }
      }
      
      updateStatsOverview(filteredData);
      updateTimeChart(filteredData);
      updateTopSitesTable(filteredData);
    });
  }
  
  function updateStatsOverview(data) {
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;
    
    Object.values(data).forEach(dayData => {
      productiveTime += dayData['productive'] || 0;
      unproductiveTime += dayData['unproductive'] || 0;
      neutralTime += dayData['neutral'] || 0;
    });
    
    document.getElementById('productive-time').textContent = formatHoursMinutes(productiveTime);
    document.getElementById('unproductive-time').textContent = formatHoursMinutes(unproductiveTime);
    document.getElementById('neutral-time').textContent = formatHoursMinutes(neutralTime);
  }
  
  function updateTimeChart(data) {
    const dates = Object.keys(data).sort();
    const productiveData = [];
    const unproductiveData = [];
    const neutralData = [];
    
    dates.forEach(date => {
      const dayData = data[date];
      productiveData.push((dayData['productive'] || 0) / 3600); // Convert to hours
      unproductiveData.push((dayData['unproductive'] || 0) / 3600);
      neutralData.push((dayData['neutral'] || 0) / 3600);
    });
    
    timeChart.data.labels = dates.map(date => formatDateLabel(date));
    timeChart.data.datasets[0].data = productiveData;
    timeChart.data.datasets[1].data = unproductiveData;
    timeChart.data.datasets[2].data = neutralData;
    timeChart.update();
  }
  
  function updateTopSitesTable(data) {
    const siteMap = {};
    
    // Aggregate time by site across all days
    Object.values(data).forEach(dayData => {
      Object.entries(dayData).forEach(([key, value]) => {
        if (!['productive', 'unproductive', 'neutral'].includes(key)) {
          siteMap[key] = (siteMap[key] || 0) + value;
        }
      });
    });
    
    // Convert to array and sort by time
    const sitesArray = Object.entries(siteMap).map(([domain, time]) => ({
      domain,
      time,
      category: getCategory(domain)
    })).sort((a, b) => b.time - a.time);
    
    // Update the table
    const tableBody = document.querySelector('#top-sites-table tbody');
    tableBody.innerHTML = '';
    
    sitesArray.slice(0, 10).forEach(site => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${site.domain}</td>
        <td>${formatHoursMinutes(site.time)}</td>
        <td class="${site.category}">${site.category}</td>
      `;
      tableBody.appendChild(row);
    });
  }
  
  function generateWeeklyReport() {
    chrome.storage.local.get(['timeData'], (result) => {
      const timeData = result.timeData || {};
      const weekData = {};
      
      // Get data for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (timeData[dateStr]) {
          weekData[dateStr] = timeData[dateStr];
        }
      }
      
      // Calculate totals
      let productiveTime = 0;
      let unproductiveTime = 0;
      let neutralTime = 0;
      const sites = {};
      
      Object.values(weekData).forEach(dayData => {
        productiveTime += dayData['productive'] || 0;
        unproductiveTime += dayData['unproductive'] || 0;
        neutralTime += dayData['neutral'] || 0;
        
        Object.entries(dayData).forEach(([key, value]) => {
          if (!['productive', 'unproductive', 'neutral'].includes(key)) {
            sites[key] = (sites[key] || 0) + value;
          }
        });
      });
      
      const totalTime = productiveTime + unproductiveTime + neutralTime;
      const productivityScore = totalTime > 0 
        ? Math.round((productiveTime / totalTime) * 100) 
        : 0;
      
      // Create report HTML
      const reportHTML = `
        <h1>Weekly Productivity Report</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        
        <h2>Summary</h2>
        <div class="report-stats">
          <p>Total tracked time: ${formatHoursMinutes(totalTime)}</p>
          <p>Productivity score: ${productivityScore}/100</p>
          <p>Productive time: ${formatHoursMinutes(productiveTime)}</p>
          <p>Unproductive time: ${formatHoursMinutes(unproductiveTime)}</p>
          <p>Neutral time: ${formatHoursMinutes(neutralTime)}</p>
        </div>
        
        <h2>Top Sites</h2>
        <ul class="top-sites-list">
          ${Object.entries(sites)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([domain, time]) => `
              <li>
                <span class="site-domain">${domain}</span>
                <span class="site-time">${formatHoursMinutes(time)}</span>
                <span class="site-category ${getCategory(domain)}">${getCategory(domain)}</span>
              </li>
            `).join('')}
        </ul>
        
        <h2>Daily Breakdown</h2>
        <table class="daily-breakdown">
          <thead>
            <tr>
              <th>Date</th>
              <th>Productive</th>
              <th>Unproductive</th>
              <th>Neutral</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(weekData)
              .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
              .map(([date, data]) => `
                <tr>
                  <td>${formatDateLabel(date)}</td>
                  <td>${formatHoursMinutes(data['productive'] || 0)}</td>
                  <td>${formatHoursMinutes(data['unproductive'] || 0)}</td>
                  <td>${formatHoursMinutes(data['neutral'] || 0)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      `;
      
      // Open report in new tab
      const reportUrl = URL.createObjectURL(new Blob([reportHTML], { type: 'text/html' }));
      chrome.tabs.create({ url: reportUrl });
    });
  }
  
  // Helper functions
  function formatHoursMinutes(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  
  function formatDateLabel(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  function getCategory(domain) {
    // This would ideally use the same categorization logic as background.js
    // For simplicity, we'll use a basic check here
    if (domain.includes('github') || domain.includes('stackoverflow')) return 'productive';
    if (domain.includes('facebook') || domain.includes('twitter')) return 'unproductive';
    return 'neutral';
  }
});