// Paste your new published CSV link for the API_Data tab below
const SHEET_URLS = {
  daily: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjRsijk74NONtJhRXlaHDLZZh4kCAItsAUafu0dOc7mUbko3KYyTDMEHKTLgf0K_DyNBHOtvRbr4wL/pub?gid=1174347993&single=true&output=csv',
  inward: '', 
  store: '',  
  stock: ''   
};

const SECRET_PIN = "1234"; // Boss login PIN
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
    if (url && url.trim() !== '' && !url.startsWith('PASTE_')) {
      await fetchAndParse(key, url);
    } else {
      dataCache[key] = [];
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
      header: true, // Row 1 is now our clean headers!
      skipEmptyLines: true,
      complete: (results) => {
        dataCache[key] = results.data || [];
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
  const data = dataCache[currentTab] || [];
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');

  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td class="py-8 text-center text-slate-400" colspan="12">No data loaded or Google Sheet URL not set.</td></tr>`;
    return;
  }

  // Create Table Headers
  const headers = Object.keys(data[0]);
  let headerRow = '<tr>';
  headers.forEach(h => {
    if (h) {
      headerRow += `<th class="py-3 px-4 font-semibold text-slate-600 uppercase text-xs tracking-wider">${h}</th>`;
    }
  });
  headerRow += '</tr>';
  thead.innerHTML = headerRow;

  // Create Table Rows with Status Badges
  data.forEach(row => {
    let tr = '<tr class="hover:bg-slate-50 transition border-b border-slate-100">';
    headers.forEach(h => {
      if (!h) return;
      let val = row[h] !== undefined && row[h] !== null ? row[h] : '';
      const lower = val.toString().toLowerCase().trim();

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
  if (tasksElem) {
    tasksElem.innerText = dataCache.daily ? dataCache.daily.length : '--';
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
