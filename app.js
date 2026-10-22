// Published CSV links from Google Sheets
const SHEET_URLS = {
  daily: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjRsijk74NONtJhRXlaHDLZZh4kCAItsAUafu0dOc7mUbko3KYyTDMEHKTLgf0K_DyNBHOtvRbr4wL/pub?gid=608979693&single=true&output=csv',
  inward: '', // Add published CSV link later
  store: '',  // Add published CSV link later
  stock: ''   // Add published CSV link later
};

const SECRET_PIN = "1234"; // Set boss login PIN here
let currentTab = 'daily';
let dataCache = {};

function checkAuth() {
  const pin = document.getElementById('passcode').value;
  if (pin === SECRET_PIN) {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    loadAllSheets();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function logout() {
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
  document.getElementById('passcode').value = '';
}

async function loadAllSheets() {
  const statusElem = document.getElementById('lastUpdated');
  if (statusElem) statusElem.innerText = "Syncing with Sheets...";

  for (let key in SHEET_URLS) {
    const url = SHEET_URLS[key];
    if (url && url.trim() !== '' && !url.startsWith('YOUR_')) {
      await fetchAndParse(key, url);
    } else {
      dataCache[key] = null;
    }
  }

  const now = new Date();
  if (statusElem) {
    statusElem.innerText = `Updated at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  updateKPIs();
  renderCurrentTab();
}

function fetchAndParse(key, url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: false, // Parse as raw rows first to safely locate headers
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = results.data || [];
        
        // Automatically find the row that contains 'Sr No'
        let headerIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const rowStr = rows[i].join(' ').toLowerCase();
          if (rowStr.includes('sr no') && rowStr.includes('status')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          dataCache[key] = [];
          resolve();
          return;
        }

        const headers = rows[headerIndex].map(h => h ? h.trim() : '');
        const dataRows = rows.slice(headerIndex + 1);

        // Convert array of rows into clean objects
        const formattedData = dataRows.map(row => {
          let obj = {};
          headers.forEach((h, index) => {
            if (h) {
              obj[h] = row[index] !== undefined ? row[index].trim() : '';
            }
          });
          return obj;
        }).filter(obj => {
          // Keep only rows where 'Sr No' has an actual number/value
          const firstHeader = headers[0];
          return firstHeader && obj[firstHeader] && obj[firstHeader] !== '';
        });

        dataCache[key] = formattedData;
        resolve();
      },
      error: (err) => {
        console.error(`Error fetching sheet [${key}]:`, err);
        dataCache[key] = [];
        resolve();
      }
    });
  });
}

function switchTab(tabKey) {
  currentTab = tabKey;

  // Highlight active sidebar button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold');
  });

  const activeBtn = document.getElementById(`btn-${tabKey}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
  }

  const titles = {
    daily: 'Daily Work Updates Log',
    inward: 'Inward Material Register',
    store: 'Store Issue Log',
    stock: 'Stock & Inventory Level'
  };

  const titleElem = document.getElementById('sectionTitle');
  if (titleElem) {
    titleElem.innerText = titles[tabKey] || 'Reports';
  }

  renderCurrentTab();
}

function renderCurrentTab() {
  const data = dataCache[currentTab];
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');

  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td class="py-8 text-center text-slate-400" colspan="12">No data loaded or Google Sheet URL not set for this tab.</td></tr>`;
    return;
  }

  // Create Table Headers dynamically
  const headers = Object.keys(data[0]);
  let headerRow = '<tr>';
  headers.forEach(h => {
    if (h) {
      headerRow += `<th class="py-3 px-4 font-semibold text-slate-600 uppercase text-xs tracking-wider">${h}</th>`;
    }
  });
  headerRow += '</tr>';
  thead.innerHTML = headerRow;

  // Create Table Rows
  data.forEach(row => {
    let tr = '<tr class="hover:bg-slate-50 transition border-b border-slate-100">';
    headers.forEach(h => {
      if (!h) return;
      let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
      const lower = val.toString().toLowerCase().trim();

      // Simple status badge formatting matching your Google Sheet colors
      if (lower === 'completed' || lower === 'done' || lower === 'ok') {
        val = `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">${val}</span>`;
      } else if (lower === 'pending' || lower === 'in progress' || lower === 'waiting for delivery' || lower === 'on hold') {
        val = `<span class="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">${val}</span>`;
      } else if (lower === 'high' || lower === 'urgent' || lower === 'no reply from vendor') {
        val = `<span class="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">${val}</span>`;
      }

      tr += `<td class="py-3 px-4 text-sm text-slate-700">${val}</td>`;
    });
    tr += '</tr>';
    tbody.innerHTML += tr;
  });
}

function updateKPIs() {
  const tasksElem = document.getElementById('kpiTasks');
  const inwardElem = document.getElementById('kpiInward');
  const storeElem = document.getElementById('kpiStore');
  const stockElem = document.getElementById('kpiStock');

  if (tasksElem) {
    tasksElem.innerText = dataCache.daily ? dataCache.daily.length : '--';
  }
  if (inwardElem) {
    inwardElem.innerText = dataCache.inward ? dataCache.inward.length : '--';
  }
  if (storeElem) {
    storeElem.innerText = dataCache.store ? dataCache.store.length : '--';
  }
  if (stockElem) {
    if (dataCache.stock && Array.isArray(dataCache.stock)) {
      const lowStockCount = dataCache.stock.filter(item => {
        const status = (item['Status'] || '').toLowerCase();
        const qty = parseInt(item['Quantity'] || '999', 10);
        return status.includes('low') || qty < 10;
      }).length;
      stockElem.innerText = lowStockCount;
    } else {
      stockElem.innerText = '--';
    }
  }
}

function filterTable() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#tableBody tr');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}
