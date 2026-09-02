/**
 * Virtual Flight Finder - Main Controller
 */

// Global State
let allFlights = [];
let filteredFlights = [];
let selectedAirlines = [];
let selectedAircraft = [];
let currentDay = 'all';
let maxDurationMins = Infinity;
let currentPage = 1;
const PAGE_SIZE = 100;
let leafletMap = null;
let globeMap = null;
let globePolylines = [];
let countdownTimer = null;

// Known Aircraft Metadata Catalog for standard categorization & aliases
const AIRCRAFT_METADATA = {
  // Boeing Narrowbody
  'B737': { name: 'Boeing 737-700', category: 'Boeing Narrowbody', aliases: ['737', '737-700'] },
  'B738': { name: 'Boeing 737-800', category: 'Boeing Narrowbody', aliases: ['737', '737-800', '800'] },
  'B739': { name: 'Boeing 737-900', category: 'Boeing Narrowbody', aliases: ['737', '737-900', '900'] },
  'B734': { name: 'Boeing 737-400', category: 'Boeing Narrowbody', aliases: ['737', '734'] },
  'B733': { name: 'Boeing 737-300', category: 'Boeing Narrowbody', aliases: ['737', '733'] },
  'B38M': { name: 'Boeing 737 MAX 8', category: 'Boeing Narrowbody', aliases: ['737', 'max', 'max 8', '738m', '7m8'] },
  'B39M': { name: 'Boeing 737 MAX 9', category: 'Boeing Narrowbody', aliases: ['737', 'max', 'max 9', '739m', '7m9'] },
  'B752': { name: 'Boeing 757-200', category: 'Boeing Narrowbody', aliases: ['757', '752'] },
  'B753': { name: 'Boeing 757-300', category: 'Boeing Narrowbody', aliases: ['757', '753'] },

  // Airbus Narrowbody
  'A318': { name: 'Airbus A318', category: 'Airbus Narrowbody', aliases: ['318'] },
  'A319': { name: 'Airbus A319', category: 'Airbus Narrowbody', aliases: ['319'] },
  'A320': { name: 'Airbus A320', category: 'Airbus Narrowbody', aliases: ['320'] },
  'A321': { name: 'Airbus A321', category: 'Airbus Narrowbody', aliases: ['321'] },
  'A20N': { name: 'Airbus A320neo', category: 'Airbus Narrowbody', aliases: ['320', 'neo', '320neo', 'a20n'] },
  'A21N': { name: 'Airbus A321neo', category: 'Airbus Narrowbody', aliases: ['321', 'neo', '321neo', 'a21n'] },
  'BCS1': { name: 'Airbus A220-100', category: 'Airbus Narrowbody', aliases: ['220', 'a220', 'bcs1', 'cseries'] },
  'BCS3': { name: 'Airbus A220-300', category: 'Airbus Narrowbody', aliases: ['220', 'a220', 'bcs3', 'cseries'] },

  // Widebody Long-Haul
  'A332': { name: 'Airbus A330-200', category: 'Widebody Long-Haul', aliases: ['330', '332'] },
  'A333': { name: 'Airbus A330-300', category: 'Widebody Long-Haul', aliases: ['330', '333'] },
  'A339': { name: 'Airbus A330-900neo', category: 'Widebody Long-Haul', aliases: ['330', '339', '330neo'] },
  'A343': { name: 'Airbus A340-300', category: 'Widebody Long-Haul', aliases: ['340', '343'] },
  'A346': { name: 'Airbus A340-600', category: 'Widebody Long-Haul', aliases: ['340', '346'] },
  'A359': { name: 'Airbus A350-900', category: 'Widebody Long-Haul', aliases: ['350', '359', '350-900'] },
  'A351': { name: 'Airbus A350-1000', category: 'Widebody Long-Haul', aliases: ['350', '351', '350-1000'] },
  'A35K': { name: 'Airbus A350-1000', category: 'Widebody Long-Haul', aliases: ['350', '35k', '350-1000'] },
  'A388': { name: 'Airbus A380-800', category: 'Widebody Long-Haul', aliases: ['380', 'a380', 'superjumbo'] },
  'B744': { name: 'Boeing 747-400', category: 'Widebody Long-Haul', aliases: ['747', '747-400', 'queen'] },
  'B748': { name: 'Boeing 747-8', category: 'Widebody Long-Haul', aliases: ['747', '747-8', 'queen'] },
  'B763': { name: 'Boeing 767-300ER', category: 'Widebody Long-Haul', aliases: ['767', '763'] },
  'B762': { name: 'Boeing 767-200', category: 'Widebody Long-Haul', aliases: ['767', '762'] },
  'B764': { name: 'Boeing 767-400', category: 'Widebody Long-Haul', aliases: ['767', '764'] },
  'B772': { name: 'Boeing 777-200ER', category: 'Widebody Long-Haul', aliases: ['777', '772'] },
  'B773': { name: 'Boeing 777-300', category: 'Widebody Long-Haul', aliases: ['777', '773'] },
  'B77W': { name: 'Boeing 777-300ER', category: 'Widebody Long-Haul', aliases: ['777', '77w', '773er'] },
  'B77L': { name: 'Boeing 777-200LR / Cargo', category: 'Widebody Long-Haul', aliases: ['777', '77l'] },
  'B788': { name: 'Boeing 787-8', category: 'Widebody Long-Haul', aliases: ['787', '788', 'dreamliner'] },
  'B789': { name: 'Boeing 787-9', category: 'Widebody Long-Haul', aliases: ['787', '789', 'dreamliner'] },
  'B78X': { name: 'Boeing 787-10', category: 'Widebody Long-Haul', aliases: ['787', '78x', '7810', 'dreamliner'] },

  // Regional Jets & Turboprops
  'E170': { name: 'Embraer E170', category: 'Regional Jets & Turboprops', aliases: ['170', 'e170', 'embraer'] },
  'E175': { name: 'Embraer E175', category: 'Regional Jets & Turboprops', aliases: ['175', 'e175', 'embraer'] },
  'E190': { name: 'Embraer E190', category: 'Regional Jets & Turboprops', aliases: ['190', 'e190', 'embraer'] },
  'E195': { name: 'Embraer E195', category: 'Regional Jets & Turboprops', aliases: ['195', 'e195', 'embraer'] },
  'E290': { name: 'Embraer E190-E2', category: 'Regional Jets & Turboprops', aliases: ['e2', 'e190-e2', 'embraer'] },
  'E295': { name: 'Embraer E195-E2', category: 'Regional Jets & Turboprops', aliases: ['e2', 'e195-e2', 'embraer'] },
  'CRJ2': { name: 'CRJ-200', category: 'Regional Jets & Turboprops', aliases: ['crj', 'crj2'] },
  'CRJ9': { name: 'CRJ-900', category: 'Regional Jets & Turboprops', aliases: ['crj', 'crj9'] },
  'CRJX': { name: 'CRJ-1000', category: 'Regional Jets & Turboprops', aliases: ['crj', 'crjx'] },
  'AT72': { name: 'ATR 72', category: 'Regional Jets & Turboprops', aliases: ['atr', 'at72', 'atr72'] },
  'AT76': { name: 'ATR 72-600', category: 'Regional Jets & Turboprops', aliases: ['atr', 'at76', 'atr72'] },
  'AT45': { name: 'ATR 42-500', category: 'Regional Jets & Turboprops', aliases: ['atr', 'at45', 'atr42'] },
  'DH8D': { name: 'De Havilland Dash 8-400', category: 'Regional Jets & Turboprops', aliases: ['q400', 'dash8', 'dh8d'] },
  'D328': { name: 'Dornier 328', category: 'Regional Jets & Turboprops', aliases: ['dornier', 'd328'] }
};

// Dynamic Dataset-Driven Airline & Aircraft Definitions
let AIRLINE_DEFINITIONS = [];
let AIRCRAFT_DEFINITIONS = [];

function buildDynamicDefinitions() {
  // 1. Build Airlines dynamically from dataset
  const airlineMap = new Map();
  allFlights.forEach(f => {
    const name = f.airline || 'Airline';
    if (!airlineMap.has(name)) {
      airlineMap.set(name, {
        id: name,
        name: name,
        icao: f.airline_icao || '',
        iata: f.airline_iata || '',
        count: 0,
        aircraft: new Set()
      });
    }
    const a = airlineMap.get(name);
    a.count++;
    if (f.aircraft_type) a.aircraft.add(f.aircraft_type);
  });

  AIRLINE_DEFINITIONS = Array.from(airlineMap.values()).map(a => ({
    id: a.id,
    name: a.name,
    icao: a.icao,
    iata: a.iata,
    count: a.count,
    aircraft: Array.from(a.aircraft)
  })).sort((a, b) => b.count - a.count);

  // 2. Build Aircraft Definitions dynamically with categorization
  const aircraftCounts = new Map();
  allFlights.forEach(f => {
    const ac = f.aircraft_type || 'A320';
    aircraftCounts.set(ac, (aircraftCounts.get(ac) || 0) + 1);
  });

  AIRCRAFT_DEFINITIONS = Array.from(aircraftCounts.entries()).map(([code, count]) => {
    const meta = AIRCRAFT_METADATA[code];
    if (meta) {
      return {
        code: code,
        name: meta.name,
        category: meta.category,
        aliases: meta.aliases || [code.toLowerCase()],
        count: count
      };
    }
    return {
      code: code,
      name: code,
      category: 'Uncategorized / Other',
      aliases: [code.toLowerCase(), code.toLowerCase().replace(/[^a-z0-9]/g, '')],
      count: count
    };
  }).sort((a, b) => b.count - a.count);
}

// DOM Elements synchronized with index.html
const searchDep = document.getElementById('search-dep');
const searchArr = document.getElementById('search-arr');
const btnSwapRoute = document.getElementById('btn-swap-route');
const filterCallsign = document.getElementById('filter-callsign');
const filterDuration = document.getElementById('filter-duration');
const durationLabel = document.getElementById('duration-label');
const sortBy = document.getElementById('sort-by');
const resetBtn = document.getElementById('reset-filters');
const resultsCount = document.getElementById('results-count');
const flightsGrid = document.getElementById('flights-grid') || document.getElementById('flights-list');
const paginationContainer = document.getElementById('pagination-container');

// Multi-select containers
const msAirline = document.getElementById('ms-airline');
const msAircraft = document.getElementById('ms-aircraft');

// Buttons & Modals
const btnThemeToggle = document.getElementById('theme-toggle') || document.getElementById('btn-theme-toggle');
const btnGlobeMap = document.getElementById('btn-globe-map');
const globeModal = document.getElementById('globe-modal');
const globeModalClose = document.getElementById('globe-modal-close');
const globeRoutesCount = document.getElementById('globe-routes-count');

// Flight Detail Modal
const flightModal = document.getElementById('flight-modal');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');
const modalLoading = document.getElementById('modal-loading');

function getDayShortName(dayNum) {
  const d = dayNum === 0 ? 7 : dayNum;
  const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[d] || 'Daily';
}

function getBadgeColorClass(airlineIcao) {
  const code = (airlineIcao || '').toUpperCase();
  if (code === 'RYR') return 'badge-ryr';
  if (code === 'DLH') return 'badge-dlh';
  if (code === 'AUA') return 'badge-aua';
  if (code === 'WZZ') return 'badge-wzz';
  if (code === 'EZY') return 'badge-ezy';
  if (code === 'BAW') return 'badge-baw';
  if (code === 'KLM') return 'badge-klm';
  if (code === 'TVS') return 'badge-tvs';
  if (code === 'UAE') return 'badge-uae';
  if (code === 'QTR') return 'badge-qtr';
  return 'badge-ryr';
}

function getAirlineCssClass(airlineName) {
  const name = (airlineName || '').toLowerCase();
  if (name.includes('ryanair')) return 'airline-ryanair';
  if (name.includes('lufthansa')) return 'airline-lufthansa';
  if (name.includes('austrian')) return 'airline-austrian-airlines';
  if (name.includes('wizz')) return 'airline-wizz-air';
  if (name.includes('easyjet')) return 'airline-easyjet';
  if (name.includes('british')) return 'airline-british-airways';
  if (name.includes('klm')) return 'airline-klm';
  if (name.includes('smartwings')) return 'airline-smartwings';
  if (name.includes('emirates')) return 'airline-emirates';
  if (name.includes('qatar')) return 'airline-qatar-airways';
  return 'airline-ryanair';
}

// ----------------------------------------------------
// Theme Management
// ----------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('vff-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.body.className = savedTheme === 'dark' ? 'theme-dark' : 'theme-light';

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.body.className = next === 'dark' ? 'theme-dark' : 'theme-light';
      localStorage.setItem('vff-theme', next);
      if (globeMap) initGlobeMap();
    });
  }
}

// ----------------------------------------------------
// Bidirectional Multi-Select Filters
// ----------------------------------------------------
function getAircraftInfo(code) {
  if (!code) return { code: 'A320', name: 'Airbus A320', category: 'Airbus Narrowbody' };
  const meta = AIRCRAFT_METADATA[code] || (AIRCRAFT_DEFINITIONS && AIRCRAFT_DEFINITIONS.find(a => a.code === code));
  if (meta) {
    return {
      code: code,
      name: meta.name || code,
      category: meta.category || 'Aircraft'
    };
  }
  return {
    code: code,
    name: code,
    category: 'Uncategorized / Other'
  };
}

function getAvailableAircraftCodes() {
  if (selectedAirlines.length === 0) {
    return AIRCRAFT_DEFINITIONS.map(a => a.code);
  }
  const allowed = new Set();
  selectedAirlines.forEach(airlineId => {
    const def = AIRLINE_DEFINITIONS.find(a => a.id === airlineId);
    if (def && def.aircraft) {
      def.aircraft.forEach(ac => allowed.add(ac));
    }
  });
  return Array.from(allowed);
}

function getAvailableAirlineIds() {
  if (selectedAircraft.length === 0) {
    return AIRLINE_DEFINITIONS.map(a => a.id);
  }
  const allowed = new Set();
  AIRLINE_DEFINITIONS.forEach(def => {
    if (def.aircraft && def.aircraft.some(ac => selectedAircraft.includes(ac))) {
      allowed.add(def.id);
    }
  });
  return Array.from(allowed);
}

function syncAircraftAvailability() {
  const allowed = getAvailableAircraftCodes();
  selectedAircraft = selectedAircraft.filter(ac => allowed.includes(ac));
  renderAircraftMultiSelect();
}

function syncAirlineAvailability() {
  const allowed = getAvailableAirlineIds();
  selectedAirlines = selectedAirlines.filter(id => allowed.includes(id));
  renderAirlineMultiSelect();
}

function renderAirlineMultiSelect(searchQuery = '') {
  if (!msAirline) return;
  const q = searchQuery.toLowerCase().trim();
  const allowed = getAvailableAirlineIds();
  
  const filtered = AIRLINE_DEFINITIONS.filter(a => {
    if (!allowed.includes(a.id)) return false;
    if (!q) return true;
    return a.name.toLowerCase().includes(q) ||
           a.icao.toLowerCase().includes(q) ||
           a.iata.toLowerCase().includes(q) ||
           a.id.toLowerCase().includes(q);
  });

  const triggerLabel = selectedAirlines.length === 0 
    ? 'All Airlines (' + allowed.length + ')' 
    : (selectedAirlines.length === 1 ? selectedAirlines[0] : selectedAirlines.length + ' Airlines Selected');

  msAirline.innerHTML = `
    <button type="button" class="ms-trigger" id="ms-airline-trigger">
      <span class="ms-trigger-text">${escapeHtml(triggerLabel)}</span>
      <span class="ms-trigger-arrow">▼</span>
    </button>
    <div class="ms-dropdown hidden" id="ms-airline-dropdown">
      <div class="ms-search-box">
        <input type="text" id="ms-airline-search" placeholder="Search airline..." value="${escapeHtml(searchQuery)}" autocomplete="off" />
      </div>
      <div class="ms-actions">
        <button type="button" class="ms-btn-action" id="ms-airline-all">${q ? 'Select Filtered (' + filtered.length + ')' : 'Select All'}</button>
        <button type="button" class="ms-btn-action" id="ms-airline-clear">Clear</button>
      </div>
      <div class="ms-options-list" id="ms-airline-list">
        ${filtered.length === 0 ? '<div style="padding: 0.8rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No matching airlines</div>' : ''}
        ${filtered.map(a => {
          const checked = selectedAirlines.includes(a.id) ? 'checked' : '';
          return `
            <div class="ms-option-item ${checked ? 'selected' : ''}" data-id="${escapeHtml(a.id)}">
              <input type="checkbox" ${checked} />
              <span class="ms-option-label">${escapeHtml(a.name)} ${a.icao ? '(' + a.icao + ')' : ''}</span>
              <span class="badge" style="font-size: 0.7rem; margin-left: auto; opacity: 0.7;">${a.count || ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const trigger = msAirline.querySelector('#ms-airline-trigger');
  const dropdown = msAirline.querySelector('#ms-airline-dropdown');
  const searchInput = msAirline.querySelector('#ms-airline-search');
  const listContainer = msAirline.querySelector('#ms-airline-list');

  // Prevent dropdown from closing when clicking inside
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(dropdown);
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  function updateAirlineList() {
    const curQ = searchInput.value.toLowerCase().trim();
    const curAllowed = getAvailableAirlineIds();
    const curFiltered = AIRLINE_DEFINITIONS.filter(a => {
      if (!curAllowed.includes(a.id)) return false;
      if (!curQ) return true;
      return a.name.toLowerCase().includes(curQ) ||
             a.icao.toLowerCase().includes(curQ) ||
             a.iata.toLowerCase().includes(curQ) ||
             a.id.toLowerCase().includes(curQ);
    });

    const btnAll = msAirline.querySelector('#ms-airline-all');
    if (btnAll) btnAll.textContent = curQ ? 'Select Filtered (' + curFiltered.length + ')' : 'Select All';

    if (curFiltered.length === 0) {
      listContainer.innerHTML = '<div style="padding: 0.8rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No matching airlines</div>';
    } else {
      listContainer.innerHTML = curFiltered.map(a => {
        const checked = selectedAirlines.includes(a.id) ? 'checked' : '';
        return `
          <div class="ms-option-item ${checked ? 'selected' : ''}" data-id="${escapeHtml(a.id)}">
            <input type="checkbox" ${checked} />
            <span class="ms-option-label">${escapeHtml(a.name)} ${a.icao ? '(' + a.icao + ')' : ''}</span>
              <span class="badge" style="font-size: 0.7rem; margin-left: auto; opacity: 0.7;">${a.count || ''}</span>
          </div>
        `;
      }).join('');
    }

    bindAirlineItemEvents();
  }

  function bindAirlineItemEvents() {
    listContainer.querySelectorAll('.ms-option-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.getAttribute('data-id');
        if (selectedAirlines.includes(id)) {
          selectedAirlines = selectedAirlines.filter(x => x !== id);
        } else {
          selectedAirlines.push(id);
        }
        syncAircraftAvailability();
        updateAirlineTriggerLabel();
        updateAirlineList();
        applyFilters();
      });
    });
  }

  function updateAirlineTriggerLabel() {
    const curAllowed = getAvailableAirlineIds();
    const label = selectedAirlines.length === 0 
      ? 'All Airlines (' + curAllowed.length + ')' 
      : (selectedAirlines.length === 1 ? selectedAirlines[0] : selectedAirlines.length + ' Airlines Selected');
    const triggerText = msAirline.querySelector('.ms-trigger-text');
    if (triggerText) triggerText.textContent = label;
  }

  searchInput.addEventListener('input', () => {
    updateAirlineList();
  });

  const btnAll = msAirline.querySelector('#ms-airline-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    const curQ = searchInput.value.toLowerCase().trim();
    const curAllowed = getAvailableAirlineIds();
    const curFiltered = AIRLINE_DEFINITIONS.filter(a => {
      if (!curAllowed.includes(a.id)) return false;
      if (!curQ) return true;
      return a.name.toLowerCase().includes(curQ) ||
             a.icao.toLowerCase().includes(curQ) ||
             a.iata.toLowerCase().includes(curQ) ||
             a.id.toLowerCase().includes(curQ);
    });

    const idsToAdd = curFiltered.map(a => a.id);
    selectedAirlines = Array.from(new Set([...selectedAirlines, ...idsToAdd]));
    syncAircraftAvailability();
    updateAirlineTriggerLabel();
    updateAirlineList();
    applyFilters();
  });

  const btnClear = msAirline.querySelector('#ms-airline-clear');
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    const curQ = searchInput.value.toLowerCase().trim();
    if (curQ) {
      const curAllowed = getAvailableAirlineIds();
      const curFiltered = AIRLINE_DEFINITIONS.filter(a => {
        if (!curAllowed.includes(a.id)) return false;
        return a.name.toLowerCase().includes(curQ) ||
               a.icao.toLowerCase().includes(curQ) ||
               a.iata.toLowerCase().includes(curQ) ||
               a.id.toLowerCase().includes(curQ);
      });
      const idsToRemove = curFiltered.map(a => a.id);
      selectedAirlines = selectedAirlines.filter(id => !idsToRemove.includes(id));
    } else {
      selectedAirlines = [];
    }
    syncAircraftAvailability();
    updateAirlineTriggerLabel();
    updateAirlineList();
    applyFilters();
  });

  bindAirlineItemEvents();
}

function renderAircraftMultiSelect(searchQuery = '') {
  if (!msAircraft) return;
  const q = searchQuery.toLowerCase().trim();
  const allowed = getAvailableAircraftCodes();

  const filtered = AIRCRAFT_DEFINITIONS.filter(a => {
    if (!allowed.includes(a.code)) return false;
    if (!q) return true;
    const aliases = a.aliases || []; return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || aliases.some(al => al.toLowerCase().includes(q));
  });

  const triggerLabel = selectedAircraft.length === 0
    ? 'All Aircraft (' + allowed.length + ')'
    : (selectedAircraft.length === 1 ? selectedAircraft[0] : selectedAircraft.length + ' Aircraft Selected');

  msAircraft.innerHTML = `
    <button type="button" class="ms-trigger" id="ms-aircraft-trigger">
      <span class="ms-trigger-text">${escapeHtml(triggerLabel)}</span>
      <span class="ms-trigger-arrow">▼</span>
    </button>
    <div class="ms-dropdown hidden" id="ms-aircraft-dropdown">
      <div class="ms-search-box">
        <input type="text" id="ms-aircraft-search" placeholder="Search aircraft (e.g. 737, A320)..." value="${escapeHtml(searchQuery)}" autocomplete="off" />
      </div>
      <div class="ms-actions">
        <button type="button" class="ms-btn-action" id="ms-aircraft-all">${q ? 'Select Filtered (' + filtered.length + ')' : 'Select All'}</button>
        <button type="button" class="ms-btn-action" id="ms-aircraft-clear">Clear</button>
      </div>
      <div class="ms-options-list" id="ms-aircraft-list">
        ${renderAircraftOptionsHtml(filtered)}
      </div>
    </div>
  `;

  const trigger = msAircraft.querySelector('#ms-aircraft-trigger');
  const dropdown = msAircraft.querySelector('#ms-aircraft-dropdown');
  const searchInput = msAircraft.querySelector('#ms-aircraft-search');
  const listContainer = msAircraft.querySelector('#ms-aircraft-list');

  // Prevent dropdown from closing when clicking inside
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(dropdown);
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  function renderAircraftOptionsHtml(items) {
    if (items.length === 0) {
      return '<div style="padding: 0.8rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No matching aircraft</div>';
    }
    const standardCategories = ['Boeing Narrowbody', 'Airbus Narrowbody', 'Widebody Long-Haul', 'Regional Jets & Turboprops'];
    const presentCategories = Array.from(new Set(items.map(a => a.category || 'Uncategorized / Other')));
    
    // Sort standard categories first, then any other category (like Uncategorized / Other)
    const sortedCategories = [
      ...standardCategories.filter(c => presentCategories.includes(c)),
      ...presentCategories.filter(c => !standardCategories.includes(c))
    ];

    let html = '';
    sortedCategories.forEach(cat => {
      const catItems = items.filter(a => (a.category || 'Uncategorized / Other') === cat);
      if (catItems.length > 0) {
        html += `<div class="ms-category-header">${escapeHtml(cat)}</div>`;
        catItems.forEach(a => {
          const checked = selectedAircraft.includes(a.code) ? 'checked' : '';
          html += `
            <div class="ms-option-item ${checked ? 'selected' : ''}" data-code="${escapeHtml(a.code)}">
              <input type="checkbox" ${checked} />
              <span class="ms-option-label"><strong>${escapeHtml(a.code)}</strong> - ${escapeHtml(a.name)}</span>
              <span class="badge" style="font-size: 0.7rem; margin-left: auto; opacity: 0.7;">${a.count || ''}</span>
            </div>
          `;
        });
      }
    });
    return html;
  }

  function updateAircraftList() {
    const curQ = searchInput.value.toLowerCase().trim();
    const curAllowed = getAvailableAircraftCodes();
    const curFiltered = AIRCRAFT_DEFINITIONS.filter(a => {
      if (!curAllowed.includes(a.code)) return false;
      if (!curQ) return true;
      const aliases = a.aliases || []; return a.code.toLowerCase().includes(curQ) || a.name.toLowerCase().includes(curQ) || aliases.some(al => al.toLowerCase().includes(curQ));
    });

    const btnAll = msAircraft.querySelector('#ms-aircraft-all');
    if (btnAll) btnAll.textContent = curQ ? 'Select Filtered (' + curFiltered.length + ')' : 'Select All';

    listContainer.innerHTML = renderAircraftOptionsHtml(curFiltered);
    bindAircraftItemEvents();
  }

  function bindAircraftItemEvents() {
    listContainer.querySelectorAll('.ms-option-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = item.getAttribute('data-code');
        if (selectedAircraft.includes(code)) {
          selectedAircraft = selectedAircraft.filter(x => x !== code);
        } else {
          selectedAircraft.push(code);
        }
        syncAirlineAvailability();
        updateAircraftTriggerLabel();
        updateAircraftList();
        applyFilters();
      });
    });
  }

  function updateAircraftTriggerLabel() {
    const curAllowed = getAvailableAircraftCodes();
    const label = selectedAircraft.length === 0
      ? 'All Aircraft (' + curAllowed.length + ')'
      : (selectedAircraft.length === 1 ? selectedAircraft[0] : selectedAircraft.length + ' Aircraft Selected');
    const triggerText = msAircraft.querySelector('.ms-trigger-text');
    if (triggerText) triggerText.textContent = label;
  }

  searchInput.addEventListener('input', () => {
    updateAircraftList();
  });

  const btnAll = msAircraft.querySelector('#ms-aircraft-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    const curQ = searchInput.value.toLowerCase().trim();
    const curAllowed = getAvailableAircraftCodes();
    const curFiltered = AIRCRAFT_DEFINITIONS.filter(a => {
      if (!curAllowed.includes(a.code)) return false;
      if (!curQ) return true;
      const aliases = a.aliases || []; return a.code.toLowerCase().includes(curQ) || a.name.toLowerCase().includes(curQ) || aliases.some(al => al.toLowerCase().includes(curQ));
    });

    // Select ONLY visible / search-filtered aircraft (e.g. 737 only!)
    const codesToAdd = curFiltered.map(a => a.code);
    selectedAircraft = Array.from(new Set([...selectedAircraft, ...codesToAdd]));
    syncAirlineAvailability();
    updateAircraftTriggerLabel();
    updateAircraftList();
    applyFilters();
  });

  const btnClear = msAircraft.querySelector('#ms-aircraft-clear');
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    const curQ = searchInput.value.toLowerCase().trim();
    if (curQ) {
      const curAllowed = getAvailableAircraftCodes();
      const curFiltered = AIRCRAFT_DEFINITIONS.filter(a => {
        if (!curAllowed.includes(a.code)) return false;
        const aliases = a.aliases || []; return a.code.toLowerCase().includes(curQ) || a.name.toLowerCase().includes(curQ) || aliases.some(al => al.toLowerCase().includes(curQ));
      });
      const codesToRemove = curFiltered.map(a => a.code);
      selectedAircraft = selectedAircraft.filter(c => !codesToRemove.includes(c));
    } else {
      selectedAircraft = [];
    }
    syncAirlineAvailability();
    updateAircraftTriggerLabel();
    updateAircraftList();
    applyFilters();
  });

  bindAircraftItemEvents();
}

function closeAllDropdowns(except = null) {
  document.querySelectorAll('.ms-dropdown').forEach(dd => {
    if (dd !== except) dd.classList.add('hidden');
  });
}

document.addEventListener('click', () => {
  closeAllDropdowns();
});

// ----------------------------------------------------
// Data Loading & Filter Processing
// ----------------------------------------------------
async function loadFlights() {
  try {
    const res = await fetch('./flights.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allFlights = await res.json();
    buildDynamicDefinitions();
    syncAirlineAvailability();
    syncAircraftAvailability();
    applyFilters();
  } catch (err) {
    console.error('Failed to load flights.json:', err);
    if (flightsGrid) {
      flightsGrid.innerHTML = `<div class="no-results" style="grid-column: 1 / -1; color: var(--color-danger);">Failed to load flight schedule. Please try refreshing.</div>`;
    }
    if (resultsCount) resultsCount.textContent = '0 flights';
  }
}

function applyFilters() {
  const depQ = (searchDep ? searchDep.value : '').toLowerCase().trim();
  const arrQ = (searchArr ? searchArr.value : '').toLowerCase().trim();
  const callsignQ = (filterCallsign ? filterCallsign.value : '').toLowerCase().trim();
  const sortOption = sortBy ? sortBy.value : 'upcoming';

  filteredFlights = allFlights.filter(f => {
    // Departure filter
    if (depQ) {
      const qDepClean = depQ.replace(/[\s\-_]/g, '').toLowerCase();
      const depText = [f.dep_icao, f.dep_iata, f.dep_city, f.dep_country].filter(Boolean).join(' ').toLowerCase();
      const depClean = depText.replace(/[\s\-_]/g, '');
      if (!depClean.includes(qDepClean) && !depText.includes(depQ)) return false;
    }

    // Arrival filter
    if (arrQ) {
      const qArrClean = arrQ.replace(/[\s\-_]/g, '').toLowerCase();
      const arrText = [f.arr_icao, f.arr_iata, f.arr_city, f.arr_country].filter(Boolean).join(' ').toLowerCase();
      const arrClean = arrText.replace(/[\s\-_]/g, '');
      if (!arrClean.includes(qArrClean) && !arrText.includes(arrQ)) return false;
    }

    // Callsign / Flight number / Aircraft search filter (Space & punctuation insensitive)
    if (callsignQ) {
      const qClean = callsignQ.replace(/[\s\-_]/g, '').toLowerCase();
      const acDef = AIRCRAFT_DEFINITIONS.find(a => a.code === f.aircraft_type);
      const acName = acDef ? acDef.name : '';
      const acAliases = acDef ? (acDef.aliases || []).join(' ') : '';
      
      const csClean = (f.callsign || '').replace(/[\s\-_]/g, '').toLowerCase();
      const fnClean = (f.flight_number || '').replace(/[\s\-_]/g, '').toLowerCase();
      const airClean = (f.airline || '').replace(/[\s\-_]/g, '').toLowerCase();
      const acClean = (f.aircraft_type || '').replace(/[\s\-_]/g, '').toLowerCase();
      const acNameClean = acName.replace(/[\s\-_]/g, '').toLowerCase();
      const acAliasesClean = acAliases.replace(/[\s\-_]/g, '').toLowerCase();

      const matches = csClean.includes(qClean) ||
                      fnClean.includes(qClean) ||
                      airClean.includes(qClean) ||
                      acClean.includes(qClean) ||
                      acNameClean.includes(qClean) ||
                      acAliasesClean.includes(qClean);

      if (!matches) return false;
    }

    // Max Duration slider
    if (typeof maxDurationMins === 'number' && isFinite(maxDurationMins) && f.duration_minutes > maxDurationMins) {
      return false;
    }

    // Airlines Multi-Select
    if (selectedAirlines.length > 0) {
      if (!selectedAirlines.includes(f.airline)) return false;
    }

    // Aircraft Multi-Select
    if (selectedAircraft.length > 0) {
      if (!selectedAircraft.includes(f.aircraft_type)) return false;
    }

    // Operating Day (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun)
    if (currentDay !== 'all') {
      const targetDay = currentDay === 0 ? 7 : currentDay;
      const flightDay = f.day_of_operation === 0 ? 7 : (f.day_of_operation || 1);
      if (flightDay !== targetDay) return false;
    }

    return true;
  });

  // Sort Calculations
  const now = new Date();
  const jsDay = now.getDay();
  const currentIsoDay = jsDay === 0 ? 7 : jsDay;
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();

  function parseMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function getUpcomingOffsetMins(flight) {
    const flightDay = flight.day_of_operation === 0 ? 7 : (flight.day_of_operation || currentIsoDay);
    const flightMins = parseMins(flight.dep_time_local);
    let daysDiff = (flightDay - currentIsoDay + 7) % 7;
    
    if (daysDiff === 0 && flightMins < currentTotalMins) {
      daysDiff = 7;
    }
    return daysDiff * 1440 + flightMins;
  }

  if (sortOption === 'duration-asc') {
    filteredFlights.sort((a, b) => a.duration_minutes - b.duration_minutes);
  } else if (sortOption === 'duration-desc') {
    filteredFlights.sort((a, b) => b.duration_minutes - a.duration_minutes);
  } else if (sortOption === 'time') {
    filteredFlights.sort((a, b) => (a.dep_time_local || '99:99').localeCompare(b.dep_time_local || '99:99'));
  } else {
    // Default 'upcoming' Live Schedule
    filteredFlights.sort((a, b) => getUpcomingOffsetMins(a) - getUpcomingOffsetMins(b));
  }

  currentPage = 1;
  renderFlights();
  renderPagination();
}

// ----------------------------------------------------
// Flight Cards Rendering
// ----------------------------------------------------
function renderFlights() {
  if (!flightsGrid) return;
  flightsGrid.innerHTML = '';

  if (resultsCount) {
    resultsCount.textContent = `${filteredFlights.length.toLocaleString()} flights`;
  }

  if (filteredFlights.length === 0) {
    flightsGrid.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
        <h3 style="margin-bottom: 0.5rem;">No flights found</h3>
        <p style="color: var(--text-muted);">Try resetting filters or adjusting search queries.</p>
      </div>
    `;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageFlights = filteredFlights.slice(start, start + PAGE_SIZE);

  pageFlights.forEach(f => {
    const card = document.createElement('div');
    const airlineClass = getAirlineCssClass(f.airline);
    const badgeClass = getBadgeColorClass(f.airline_icao);
    card.className = `flight-card ${airlineClass}`;

    const durH = Math.floor(f.duration_minutes / 60);
    const durM = f.duration_minutes % 60;
    const durStr = `${durH}h ${durM < 10 ? '0' : ''}${durM}m`;

    card.innerHTML = `
      <div class="fc-header">
        <div class="fc-airline-pill ${badgeClass}">
          ${escapeHtml(f.airline || 'Ryanair')}
        </div>
        <div class="fc-identifiers-group">
          <div class="fc-identifiers-row">
            <span class="badge day-badge" title="Operating Day">${escapeHtml(getDayShortName(f.day_of_operation))}</span>
            <span class="badge homebase-badge" title="Homebase Airport">Base: ${escapeHtml(f.homebase || f.dep_icao)}</span>
          </div>
          <div class="fc-identifiers-row">
            <span class="badge callsign">${escapeHtml(f.callsign || f.flight_number)}</span>
            ${f.flight_number && f.flight_number !== f.callsign ? `<span class="badge flightnum">${escapeHtml(f.flight_number)}</span>` : ''}
            <span class="badge aircraft-badge">${escapeHtml(f.aircraft_type || 'B738')}</span>
          </div>
        </div>
      </div>

      <div class="fc-route">
        <div class="fc-airport fc-dep">
          <span class="fc-time">${escapeHtml(f.dep_time_local || '08:00')}</span>
          <span class="fc-utc">${escapeHtml(f.dep_time_utc || '06:00')} UTC</span>
          <span class="fc-code">${escapeHtml(f.dep_icao)} ${f.dep_iata ? '(' + escapeHtml(f.dep_iata) + ')' : ''}</span>
          <span class="fc-city">${escapeHtml(f.dep_city || '')}</span>
        </div>

        <div class="fc-arrow">➔</div>

        <div class="fc-airport fc-arr">
          <span class="fc-time">${escapeHtml(f.arr_time_local || '10:00')}</span>
          <span class="fc-utc">${escapeHtml(f.arr_time_utc || '08:00')} UTC</span>
          <span class="fc-code">${escapeHtml(f.arr_icao)} ${f.arr_iata ? '(' + escapeHtml(f.arr_iata) + ')' : ''}</span>
          <span class="fc-city">${escapeHtml(f.arr_city || '')}</span>
        </div>
      </div>

      <div class="fc-footer">
        <div class="fc-meta">
          <span>🕒 ${durStr}</span>
          <span>• ${f.distance_nm || '—'} NM</span>
        </div>
        <div class="fc-days">
          ${[1,2,3,4,5,6,7].map(d => {
            const cardDay = f.day_of_operation === 0 ? 7 : (f.day_of_operation || 1);
            const operates = (f.days_of_week || f.days_of_operation || []).map(x => x === 0 ? 7 : x).includes(d);
            const isCurrentCardDay = (cardDay === d);
            const dotClass = isCurrentCardDay ? 'active active-primary' : (operates ? 'active active-secondary' : '');
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            return `<span class="day-dot ${dotClass}" title="${labels[d-1]}: ${operates ? 'Operates' : 'No flight'}">${labels[d-1]}</span>`;
          }).join('')}
        </div>
      </div>
    `;

    card.addEventListener('click', () => openFlightModal(f));
    flightsGrid.appendChild(card);
  });
}

function renderPagination() {
  if (!paginationContainer) return;
  paginationContainer.innerHTML = '';
  const totalPages = Math.ceil(filteredFlights.length / PAGE_SIZE);
  if (totalPages <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.className = 'btn-page';
  btnPrev.textContent = '◀ Previous';
  btnPrev.disabled = currentPage === 1;
  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderFlights();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(btnPrev);

  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationContainer.appendChild(pageInfo);

  const btnNext = document.createElement('button');
  btnNext.className = 'btn-page';
  btnNext.textContent = 'Next ▶';
  btnNext.disabled = currentPage === totalPages;
  btnNext.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderFlights();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(btnNext);
}

// ----------------------------------------------------
// Event Listeners Setup
// ----------------------------------------------------
function initEventListeners() {
  if (searchDep) searchDep.addEventListener('input', debounce(applyFilters, 150));
  if (searchArr) searchArr.addEventListener('input', debounce(applyFilters, 150));
  if (filterCallsign) filterCallsign.addEventListener('input', debounce(applyFilters, 150));
  if (sortBy) sortBy.addEventListener('change', applyFilters);

  // Swap Route Button
  if (btnSwapRoute) {
    btnSwapRoute.addEventListener('click', () => {
      if (searchDep && searchArr) {
        const tmp = searchDep.value;
        searchDep.value = searchArr.value;
        searchArr.value = tmp;
        applyFilters();
      }
    });
  }

  // Duration Slider
  if (filterDuration) {
    filterDuration.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const maxVal = parseInt(filterDuration.max, 10) || 960;
      if (val >= maxVal) {
        maxDurationMins = Infinity;
        if (durationLabel) durationLabel.textContent = 'Any';
      } else {
        maxDurationMins = val;
        const h = Math.floor(val / 60);
        const m = val % 60;
        if (durationLabel) durationLabel.textContent = `≤ ${h}h ${m > 0 ? m + 'm' : ''}`;
      }
      applyFilters();
    });
  }

  // Day Filter Buttons
  document.querySelectorAll('.vff-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vff-day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dayAttr = btn.getAttribute('data-day');
      currentDay = dayAttr === 'all' ? 'all' : parseInt(dayAttr, 10);
      applyFilters();
    });
  });

  // Reset Filters
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchDep) searchDep.value = '';
      if (searchArr) searchArr.value = '';
      if (filterCallsign) filterCallsign.value = '';
      if (filterDuration) {
        filterDuration.value = '960';
        maxDurationMins = Infinity;
        if (durationLabel) durationLabel.textContent = 'Any';
      }
      if (sortBy) sortBy.value = 'upcoming';

      selectedAirlines = [];
      selectedAircraft = [];
      currentDay = 'all';

      document.querySelectorAll('.vff-day-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-day') === 'all');
      });

      renderAirlineMultiSelect();
      renderAircraftMultiSelect();
      applyFilters();
    });
  }

  // Modal Close
  if (modalClose) modalClose.addEventListener('click', closeFlightModal);
  if (flightModal) {
    flightModal.addEventListener('click', (e) => {
      if (e.target === flightModal) closeFlightModal();
    });
  }

  // Globe Modal
  if (btnGlobeMap) btnGlobeMap.addEventListener('click', openGlobeModal);
  if (globeModalClose) globeModalClose.addEventListener('click', closeGlobeModal);
  if (globeModal) {
    globeModal.addEventListener('click', (e) => {
      if (e.target === globeModal) closeGlobeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFlightModal();
      closeGlobeModal();
    }
  });
}

function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ----------------------------------------------------
// Globe Route Map Modal
// ----------------------------------------------------
function openGlobeModal() {
  if (!globeModal) return;
  globeModal.classList.remove('hidden');
  if (globeRoutesCount) {
    globeRoutesCount.textContent = `Showing ${filteredFlights.length.toLocaleString()} routes`;
  }
  setTimeout(initGlobeMap, 100);
}

function closeGlobeModal() {
  if (globeModal) globeModal.classList.add('hidden');
}

function initGlobeMap() {
  const container = document.getElementById('globe-map');
  if (!container) return;

  if (!globeMap) {
    globeMap = L.map('globe-map', {
      center: [48.17, 17.21],
      zoom: 4,
      minZoom: 2,
      maxZoom: 18
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(globeMap);
  }

  globeMap.invalidateSize();

  // Clear existing polylines
  globePolylines.forEach(layer => globeMap.removeLayer(layer));
  globePolylines = [];

  // Draw ALL unique route pairs to show full network coverage
  const seenRoutes = new Map();
  filteredFlights.forEach(f => {
    const depIcao = f.dep_icao;
    const arrIcao = f.arr_icao;
    if (!depIcao || !arrIcao) return;
    const key = depIcao < arrIcao ? depIcao + '_' + arrIcao : arrIcao + '_' + depIcao;
    if (!seenRoutes.has(key)) {
      seenRoutes.set(key, f);
    }
  });

  const bounds = [];
  seenRoutes.forEach(f => {
    const depLat = f.dep_lat || f.departure_lat;
    const depLon = f.dep_lon || f.departure_lon;
    const arrLat = f.arr_lat || f.arrival_lat;
    const arrLon = f.arr_lon || f.arrival_lon;

    if (depLat && depLon && arrLat && arrLon) {
      bounds.push([depLat, depLon], [arrLat, arrLon]);
      const line = L.polyline([[depLat, depLon], [arrLat, arrLon]], {
        color: '#f97316',
        weight: 2,
        opacity: 0.65,
        className: 'route-polyline'
      });

      const tooltipContent = `
        <div style="font-weight: 700; color: #38bdf8; margin-bottom: 2px;">${escapeHtml(f.airline)} (${escapeHtml(f.callsign || f.flight_number || '')})</div>
        <div style="font-size: 0.85rem; font-weight: 600;">${f.dep_icao} (${f.dep_city || ''}) ➔ ${f.arr_icao} (${f.arr_city || ''})</div>
        <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 3px;">${f.aircraft_type || 'B738'} • ${f.distance_nm || '—'} NM • ${Math.floor(f.duration_minutes / 60)}h ${f.duration_minutes % 60}m</div>
        <div style="font-size: 0.7rem; color: #f59e0b; margin-top: 4px; font-weight: 600;">Click route to open flight details ➔</div>
      `;

      line.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'map-route-tooltip',
        direction: 'top',
        offset: [0, -10]
      });

      line.on('mouseover', function () {
        this.setStyle({ color: '#38bdf8', weight: 4, opacity: 1 });
      });

      line.on('mouseout', function () {
        this.setStyle({ color: '#f97316', weight: 2, opacity: 0.65 });
      });

      line.on('click', (e) => {
        if (e && e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        openFlightModal(f);
      });

      line.addTo(globeMap);
      globePolylines.push(line);
    }
  });

  if (bounds.length > 0) {
    try {
      globeMap.fitBounds(bounds, { padding: [40, 40] });
    } catch(e) {}
  }
}

// ----------------------------------------------------
// Flight Detail Modal Controller
// ----------------------------------------------------
async function openFlightModal(flight) {
  if (!flightModal) return;
  flightModal.classList.remove('hidden');
  if (modalLoading) modalLoading.style.display = 'none';
  if (modalBody) modalBody.classList.remove('hidden');

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  const callsign = flight.callsign || flight.flight_number || 'N/A';
  document.getElementById('m-callsign-header').textContent = callsign;
  document.getElementById('m-flight-number-sub').textContent = flight.flight_number ? `Flight: ${flight.flight_number} • ${flight.airline}` : flight.airline;
  document.getElementById('m-dep').textContent = `${flight.dep_icao} (${flight.dep_iata || flight.dep_city || '---'})`;
  document.getElementById('m-arr').textContent = `${flight.arr_icao} (${flight.arr_iata || flight.arr_city || '---'})`;

  // External Search Links
  document.getElementById('m-google-search-btn').href = `https://www.google.com/search?q=${encodeURIComponent(callsign + ' flight')}`;
  document.getElementById('m-flightaware-search-btn').href = `https://www.flightaware.com/live/flight/${encodeURIComponent(callsign)}`;
  document.getElementById('m-flightradar-search-btn').href = `https://www.flightradar24.com/data/flights/${encodeURIComponent(flight.flight_number || callsign)}`;
  document.getElementById('m-adsb-search-btn').href = `https://globe.adsbexchange.com/?callsign=${encodeURIComponent(callsign)}`;

  // SimBrief & SkyVector Links
  const simbriefBtn = document.getElementById('m-simbrief-btn');
  if (simbriefBtn) {
    const params = new URLSearchParams({
      orig: flight.dep_icao,
      dest: flight.arr_icao,
      type: flight.aircraft_type || 'B738',
      callsign: callsign,
      fltnum: flight.flight_number ? flight.flight_number.replace(/\D/g, '') : ''
    });
    simbriefBtn.href = `https://dispatch.simbrief.com/options/custom?${params.toString()}`;
  }

  const skyvectorBtn = document.getElementById('m-skyvector-btn');
  if (skyvectorBtn) {
    skyvectorBtn.href = `https://skyvector.com/?fpl=${flight.dep_icao}+${flight.arr_icao}`;
  }

  // Departure & Arrival Times (Local, UTC, and Your Browser Local)
  const depLocal = flight.dep_time_local || flight.departure_time || '08:00';
  const depUtc = flight.dep_time_utc || flight.departure_time_utc || depLocal;
  const arrLocal = flight.arr_time_local || flight.arrival_time || '10:00';
  const arrUtc = flight.arr_time_utc || flight.arrival_time_utc || arrLocal;

  function formatTimeWithTz(timeStr, tzOffset) {
    if (!timeStr) return '--:--';
    if (tzOffset === undefined || tzOffset === null) return timeStr;
    const sign = tzOffset >= 0 ? '+' : '';
    return `${timeStr} (UTC${sign}${tzOffset})`;
  }

  function utcToBrowserLocalTime(utcTimeStr) {
    if (!utcTimeStr) return '--:--';
    const [uH, uM] = utcTimeStr.split(':').map(Number);
    const userOffsetMins = -new Date().getTimezoneOffset();
    let totalMins = ((uH || 0) * 60 + (uM || 0) + userOffsetMins) % 1440;
    if (totalMins < 0) totalMins += 1440;
    const bH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const bM = (totalMins % 60).toString().padStart(2, '0');
    return `${bH}:${bM}`;
  }

  const userTzOffsetHours = -new Date().getTimezoneOffset() / 60;
  const userTzSign = userTzOffsetHours >= 0 ? '+' : '';
  const userTzLabel = `UTC${userTzSign}${userTzOffsetHours}`;

  document.getElementById('m-dep-time-local').textContent = formatTimeWithTz(depLocal, flight.dep_tz);
  document.getElementById('m-dep-time-utc').textContent = `${depUtc} UTC`;
  document.getElementById('m-dep-time-your-local').textContent = `${utcToBrowserLocalTime(depUtc)} (${userTzLabel})`;

  document.getElementById('m-arr-time-local').textContent = formatTimeWithTz(arrLocal, flight.arr_tz);
  document.getElementById('m-arr-time-utc').textContent = `${arrUtc} UTC`;
  document.getElementById('m-arr-time-your-local').textContent = `${utcToBrowserLocalTime(arrUtc)} (${userTzLabel})`;

  // Real-time dynamic Countdown calculation to upcoming scheduled departure
  function updateCountdowns() {
    const now = new Date();
    const nowDay = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
    const nowUtcMins = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;

    const flightDay = flight.day_of_operation === 0 ? 7 : (flight.day_of_operation || nowDay);
    const [dH, dM] = (depUtc || '12:00').split(':').map(Number);
    const flightUtcMins = (dH || 0) * 60 + (dM || 0);

    let daysDiff = (flightDay - nowDay + 7) % 7;
    if (daysDiff === 0 && flightUtcMins < nowUtcMins) {
      daysDiff = 7;
    }

    const diffMins = daysDiff * 1440 + (flightUtcMins - nowUtcMins);
    const totalSec = Math.max(0, Math.floor(diffMins * 60));

    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    let countdownStr = '';
    if (d > 0) {
      countdownStr = `in ${d}d ${h}h ${m}m`;
    } else if (h > 0) {
      countdownStr = `in ${h}h ${m}m ${s}s`;
    } else {
      countdownStr = `in ${m}m ${s}s`;
    }

    const depCountdownEl = document.getElementById('m-dep-countdown');
    if (depCountdownEl) {
      depCountdownEl.textContent = countdownStr;
    }

    const arrCountdownEl = document.getElementById('m-arr-countdown');
    if (arrCountdownEl) {
      const arrTotalSec = totalSec + (flight.duration_minutes || 90) * 60;
      const ad = Math.floor(arrTotalSec / 86400);
      const ah = Math.floor((arrTotalSec % 86400) / 3600);
      const am = Math.floor((arrTotalSec % 3600) / 60);
      arrCountdownEl.textContent = ad > 0 ? `in ${ad}d ${ah}h ${am}m` : `in ${ah}h ${am}m`;
    }
  }

  updateCountdowns();
  countdownTimer = setInterval(updateCountdowns, 1000);

  // Dispatch & Stats
  document.getElementById('m-fstat-dist').textContent = flight.distance_nm || '—';
  document.getElementById('m-fstat-fl').textContent = flight.planned_fl || (flight.distance_nm > 500 ? 'FL360' : 'FL320');
  const durH = Math.floor(flight.duration_minutes / 60);
  const durM = flight.duration_minutes % 60;
  document.getElementById('m-fstat-dur').textContent = `${durH}h ${durM < 10 ? '0' : ''}${durM}m`;
  document.getElementById('m-fstat-wpts').textContent = flight.route_string ? flight.route_string.split(' ').length : 'DCT';
  document.getElementById('m-route-string').textContent = flight.route_string || 'DCT';

  // LiveATC links
  document.getElementById('m-dep-liveatc-btn').href = `https://www.liveatc.net/search/?icao=${flight.dep_icao}`;
  document.getElementById('m-arr-liveatc-btn').href = `https://www.liveatc.net/search/?icao=${flight.arr_icao}`;

  // Fetch Weather & VATSIM
  fetchLiveWeather(flight.dep_icao, 'dep');
  fetchLiveWeather(flight.arr_icao, 'arr');
  fetchVatsimAtc(flight.dep_icao, 'dep');
  fetchVatsimAtc(flight.arr_icao, 'arr');

  // Leaflet Route Map
  setTimeout(() => {
    initRouteMap(flight);
  }, 100);
}

function initRouteMap(flight) {
  const mapContainer = document.getElementById('m-route-map');
  if (!mapContainer) return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  const depLat = flight.dep_lat || flight.departure_lat || 48.17;
  const depLon = flight.dep_lon || flight.departure_lon || 17.21;
  const arrLat = flight.arr_lat || flight.arrival_lat || 51.88;
  const arrLon = flight.arr_lon || flight.arrival_lon || 0.23;

  try {
    leafletMap = L.map('m-route-map').fitBounds([
      [depLat, depLon],
      [arrLat, arrLon]
    ], { padding: [30, 30] });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(leafletMap);

    L.marker([depLat, depLon]).addTo(leafletMap).bindPopup(`<strong>${flight.dep_icao}</strong> (${flight.dep_city || ''})`);
    L.marker([arrLat, arrLon]).addTo(leafletMap).bindPopup(`<strong>${flight.arr_icao}</strong> (${flight.arr_city || ''})`);

    L.polyline([[depLat, depLon], [arrLat, arrLon]], {
      color: '#00BDB1',
      weight: 3,
      dashArray: '6, 6'
    }).addTo(leafletMap);
  } catch (e) {
    console.warn('Leaflet route map init error:', e);
  }
}

function closeFlightModal() {
  if (flightModal) flightModal.classList.add('hidden');
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

async function fetchLiveWeather(icao, type) {
  const rawEl = document.getElementById(type === 'dep' ? 'm-dep-metar-raw' : 'm-arr-metar-raw');
  const graphicEl = document.getElementById(type === 'dep' ? 'm-dep-metar-graphic' : 'm-arr-metar-graphic');
  const lblEl = document.getElementById(type === 'dep' ? 'm-dep-icao-lbl' : 'm-arr-icao-lbl');

  if (lblEl) lblEl.textContent = `(${icao})`;
  if (rawEl) rawEl.textContent = 'Fetching METAR...';
  if (graphicEl) graphicEl.innerHTML = '';

  try {
    const res = await fetch(`https://metar.vatsim.net/${icao}`);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim()) {
        const metar = text.trim();
        if (rawEl) rawEl.textContent = metar;

        if (graphicEl) {
          const windMatch = metar.match(/(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT/);
          const visMatch = metar.match(/\b(\d{4})\b/) || metar.match(/\b(CAVOK|9999)\b/);
          const tempMatch = metar.match(/\b(M?\d{2})\/(M?\d{2})\b/);
          const qnhMatch = metar.match(/\b(Q|A)(\d{4})\b/);

          graphicEl.innerHTML = `
            <div class="metar-bar-row">
              <span>💨 Wind: <strong>${windMatch ? windMatch[0] : 'Calm / VRB'}</strong></span>
              <span>👁️ Vis: <strong>${visMatch ? visMatch[0] : '10km+'}</strong></span>
            </div>
            <div class="metar-bar-row">
              <span>🌡️ Temp: <strong>${tempMatch ? tempMatch[0] + '°C' : 'N/A'}</strong></span>
              <span>🧭 QNH: <strong>${qnhMatch ? qnhMatch[0] : '1013'}</strong></span>
            </div>
          `;
        }
        return;
      }
    }
    if (rawEl) rawEl.textContent = 'No active METAR reported.';
  } catch (e) {
    if (rawEl) rawEl.textContent = 'METAR service temporarily unavailable.';
  }
}

async function fetchVatsimAtc(icao, type) {
  const atcListEl = document.getElementById(type === 'dep' ? 'm-dep-vatsim-atc' : 'm-arr-vatsim-atc');
  if (!atcListEl) return;
  atcListEl.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.2rem;">Checking online controllers...</div>';

  try {
    const res = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
    if (res.ok) {
      const data = await res.json();
      const controllers = (data.controllers || []).filter(c => c.callsign && c.callsign.startsWith(icao));
      
      if (controllers.length > 0) {
        atcListEl.innerHTML = controllers.map(c => `
          <div class="atc-item">
            <span class="atc-callsign">● ${escapeHtml(c.callsign)}</span>
            <span class="atc-freq">${escapeHtml(c.frequency)} MHz</span>
          </div>
        `).join('');
      } else {
        atcListEl.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.2rem;">No active controllers online</div>';
      }
    } else {
      atcListEl.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.2rem;">VATSIM status offline</div>';
    }
  } catch (e) {
    atcListEl.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.2rem;">VATSIM feed unavailable</div>';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderAirlineMultiSelect();
  renderAircraftMultiSelect();
  initEventListeners();
  loadFlights();
});
