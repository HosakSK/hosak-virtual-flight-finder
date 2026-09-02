// Virtual Flight Finder - Main Application Logic (Clean & Rich)

let allFlights = [];
let filteredFlights = [];
let currentDay = 'all';
let leafletMap = null;
let globeMap = null;
let globePolylines = [];
let countdownTimer = null;

// Pagination State
let currentPage = 1;
const PAGE_SIZE = 100;

// Multi-select State
let selectedAirlines = []; // empty = all
let selectedAircraft = []; // empty = all

// Master Airline Definitions
const AIRLINE_DEFINITIONS = [
  { id: 'Ryanair', name: 'Ryanair', icao: 'RYR', iata: 'FR', aircraft: ['B738', 'B38M'] },
  { id: 'Wizz Air', name: 'Wizz Air', icao: 'WZZ', iata: 'W6', aircraft: ['A320', 'A321', 'A21N'] },
  { id: 'easyJet', name: 'easyJet', icao: 'EZY', iata: 'U2', aircraft: ['A320', 'A321', 'A21N'] },
  { id: 'Lufthansa', name: 'Lufthansa', icao: 'DLH', iata: 'LH', aircraft: ['A320', 'A321', 'A359', 'B744', 'B748', 'A388'] },
  { id: 'British Airways', name: 'British Airways', icao: 'BAW', iata: 'BA', aircraft: ['A320', 'A321', 'A35K', 'B77W', 'B789', 'A388'] },
  { id: 'KLM', name: 'KLM Royal Dutch Airlines', icao: 'KLM', iata: 'KL', aircraft: ['B738', 'B77W', 'A321'] },
  { id: 'Smartwings', name: 'Smartwings', icao: 'TVS', iata: 'QS', aircraft: ['B738', 'B38M'] },
  { id: 'Austrian Airlines', name: 'Austrian Airlines', icao: 'AUA', iata: 'OS', aircraft: ['A320', 'A321', 'E195', 'B789'] },
  { id: 'Emirates', name: 'Emirates', icao: 'UAE', iata: 'EK', aircraft: ['A388', 'B77W'] },
  { id: 'Qatar Airways', name: 'Qatar Airways', icao: 'QTR', iata: 'QR', aircraft: ['A388', 'A35K', 'A359', 'B77W', 'B789'] }
];

// Master Aircraft Definitions
const AIRCRAFT_DEFINITIONS = [
  { code: 'B738', name: 'Boeing 737-800', category: 'Boeing Narrowbody', keywords: '737 738 b738 boeing' },
  { code: 'B38M', name: 'Boeing 737 MAX 8', category: 'Boeing Narrowbody', keywords: '737 max max8 b38m boeing' },
  { code: 'A320', name: 'Airbus A320', category: 'Airbus Narrowbody', keywords: '320 a320 airbus' },
  { code: 'A321', name: 'Airbus A321', category: 'Airbus Narrowbody', keywords: '321 a321 airbus' },
  { code: 'A21N', name: 'Airbus A321neo', category: 'Airbus Narrowbody', keywords: '321 neo a21n airbus' },
  { code: 'E190', name: 'Embraer E190', category: 'Regional', keywords: 'e190 embraer' },
  { code: 'E195', name: 'Embraer E195', category: 'Regional', keywords: 'e195 embraer' },
  { code: 'B77W', name: 'Boeing 777-300ER', category: 'Boeing Widebody', keywords: '777 77w b77w triple seven' },
  { code: 'B789', name: 'Boeing 787-9 Dreamliner', category: 'Boeing Widebody', keywords: '787 789 b789 dreamliner' },
  { code: 'A359', name: 'Airbus A350-900', category: 'Airbus Widebody', keywords: '350 359 a359 airbus' },
  { code: 'A35K', name: 'Airbus A350-1000', category: 'Airbus Widebody', keywords: '350 35k a35k airbus' },
  { code: 'A388', name: 'Airbus A380-800', category: 'Super Heavy & Jumbo', keywords: '380 a388 superjumbo heavy' },
  { code: 'B748', name: 'Boeing 747-8', category: 'Super Heavy & Jumbo', keywords: '747 748 b748 queen jumbo' },
  { code: 'B744', name: 'Boeing 747-400', category: 'Super Heavy & Jumbo', keywords: '747 744 b744 queen jumbo' }
];

// DOM Elements
const searchDep = document.getElementById('search-dep');
const searchArr = document.getElementById('search-arr');
const btnSwapRoute = document.getElementById('btn-swap-route');
const filterCallsign = document.getElementById('filter-callsign');
const filterDuration = document.getElementById('filter-duration');
const durationLabel = document.getElementById('duration-label');
const sortBy = document.getElementById('sort-by');
const resetFiltersBtn = document.getElementById('reset-filters');
const resultsCount = document.getElementById('results-count');
const flightsGrid = document.getElementById('flights-grid');

const msAirline = document.getElementById('ms-airline');
const msAircraft = document.getElementById('ms-aircraft');

const btnGlobeMap = document.getElementById('btn-globe-map');
const globeModal = document.getElementById('globe-modal');
const globeModalClose = document.getElementById('globe-modal-close');
const globeRoutesCount = document.getElementById('globe-routes-count');

const paginationContainer = document.getElementById('pagination-container');
const paginationInfo = document.getElementById('pagination-info');
const btnPageFirst = document.getElementById('btn-page-first');
const btnPagePrev = document.getElementById('btn-page-prev');
const pageNumbersContainer = document.getElementById('page-numbers');
const btnPageNext = document.getElementById('btn-page-next');
const btnPageLast = document.getElementById('btn-page-last');

const flightModal = document.getElementById('flight-modal');
const modalClose = document.getElementById('modal-close');
const modalLoading = document.getElementById('modal-loading');
const modalBody = document.getElementById('modal-body');

const themeToggle = document.getElementById('theme-toggle');
const lastUpdatedText = document.getElementById('last-updated-text');

// Helper: Distance
function calcDistanceNm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupMultiSelects();
  setupEventListeners();
  await loadMetadata();
  await loadFlights();
});

// Theme Management
function setupTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (globeMap) initGlobeMap();
    });
  }
}

async function loadMetadata() {
  try {
    const res = await fetch('./metadata.json');
    if (res.ok) {
      const data = await res.json();
      if (lastUpdatedText && data.last_updated_formatted) {
        lastUpdatedText.textContent = 'Last updated: ' + data.last_updated_formatted;
      }
    }
  } catch (e) {
    console.warn('Metadata not loaded', e);
  }
}

// SEARCHABLE MULTI-SELECT FILTER ENGINE
function setupMultiSelects() {
  renderAirlineMultiSelect();
  renderAircraftMultiSelect();

  document.addEventListener('click', (e) => {
    if (msAirline && !msAirline.contains(e.target)) closeDropdown(msAirline);
    if (msAircraft && !msAircraft.contains(e.target)) closeDropdown(msAircraft);
  });
}

function openDropdown(container) {
  container.classList.add('open');
  const dd = container.querySelector('.ms-dropdown');
  if (dd) {
    dd.classList.remove('hidden');
    const input = dd.querySelector('.ms-search-input');
    if (input) input.focus();
  }
}

function closeDropdown(container) {
  container.classList.remove('open');
  const dd = container.querySelector('.ms-dropdown');
  if (dd) dd.classList.add('hidden');
}

function toggleDropdown(container) {
  if (container.classList.contains('open')) {
    closeDropdown(container);
  } else {
    if (msAirline && msAirline !== container) closeDropdown(msAirline);
    if (msAircraft && msAircraft !== container) closeDropdown(msAircraft);
    openDropdown(container);
  }
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

function syncAircraftAvailability() {
  const allowed = getAvailableAircraftCodes();
  selectedAircraft = selectedAircraft.filter(ac => allowed.includes(ac));
  renderAircraftMultiSelect();
}

function renderAirlineMultiSelect(searchQuery = '') {
  if (!msAirline) return;
  const q = searchQuery.toLowerCase().trim();
  
  const filtered = AIRLINE_DEFINITIONS.filter(a => {
    if (!q) return true;
    return a.name.toLowerCase().includes(q) ||
           a.icao.toLowerCase().includes(q) ||
           a.iata.toLowerCase().includes(q) ||
           a.id.toLowerCase().includes(q);
  });

  const triggerLabel = selectedAirlines.length === 0 
    ? 'All Airlines (' + AIRLINE_DEFINITIONS.length + ')' 
    : (selectedAirlines.length === 1 ? selectedAirlines[0] : selectedAirlines.length + ' Airlines Selected');

  msAirline.innerHTML = `
    <div class="ms-trigger" tabindex="0" id="ms-airline-trigger">
      <span class="ms-trigger-label">${escapeHtml(triggerLabel)}</span>
      <span class="ms-trigger-arrow">▼</span>
    </div>
    <div class="ms-dropdown ${msAirline.classList.contains('open') ? '' : 'hidden'}">
      <div class="ms-search-box">
        <input type="text" class="ms-search-input" id="ms-airline-search" placeholder="Search airline or code (e.g. RYR, LH)..." value="${escapeHtml(searchQuery)}" />
      </div>
      <div class="ms-actions">
        <button type="button" class="ms-btn-link" id="ms-airline-all">Select All</button>
        <button type="button" class="ms-btn-link" id="ms-airline-clear">Clear</button>
      </div>
      <div class="ms-options-list">
        ${filtered.length === 0 ? '<div style="padding: 0.6rem; color: var(--text-muted); font-size: 0.8rem; text-align: center;">No matching airlines</div>' : ''}
        ${filtered.map(a => {
          const isChecked = selectedAirlines.includes(a.id);
          return `
            <div class="ms-option-item ${isChecked ? 'selected' : ''}" data-id="${escapeHtml(a.id)}">
              <input type="checkbox" class="ms-option-checkbox" ${isChecked ? 'checked' : ''} />
              <div class="ms-option-label">
                <span>${escapeHtml(a.name)}</span>
                <span class="ms-option-tag">${escapeHtml(a.icao)} / ${escapeHtml(a.iata)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const trigger = msAirline.querySelector('#ms-airline-trigger');
  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(msAirline); });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(msAirline); }
  });

  const searchInput = msAirline.querySelector('#ms-airline-search');
  searchInput.addEventListener('input', (e) => {
    renderAirlineMultiSelect(e.target.value);
    const newInput = msAirline.querySelector('#ms-airline-search');
    if (newInput) {
      newInput.focus();
      newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    }
  });
  searchInput.addEventListener('click', (e) => e.stopPropagation());

  const btnAll = msAirline.querySelector('#ms-airline-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAirlines = AIRLINE_DEFINITIONS.map(a => a.id);
    syncAircraftAvailability();
    renderAirlineMultiSelect(searchInput.value);
    applyFilters();
  });

  const btnClear = msAirline.querySelector('#ms-airline-clear');
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAirlines = [];
    syncAircraftAvailability();
    renderAirlineMultiSelect(searchInput.value);
    applyFilters();
  });

  msAirline.querySelectorAll('.ms-option-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.getAttribute('data-id');
      if (selectedAirlines.includes(id)) {
        selectedAirlines = selectedAirlines.filter(x => x !== id);
      } else {
        selectedAirlines.push(id);
      }
      syncAircraftAvailability();
      renderAirlineMultiSelect(searchInput.value);
      applyFilters();
    });
  });
}

function renderAircraftMultiSelect(searchQuery = '') {
  if (!msAircraft) return;
  const q = searchQuery.toLowerCase().trim();
  const allowed = getAvailableAircraftCodes();

  const filtered = AIRCRAFT_DEFINITIONS.filter(a => {
    if (!allowed.includes(a.code)) return false;
    if (!q) return true;
    return a.code.toLowerCase().includes(q) ||
           a.name.toLowerCase().includes(q) ||
           a.keywords.toLowerCase().includes(q);
  });

  const triggerLabel = selectedAircraft.length === 0
    ? 'All Aircraft (' + allowed.length + ')'
    : (selectedAircraft.length === 1 ? selectedAircraft[0] : selectedAircraft.length + ' Aircraft Selected');

  const categories = {};
  filtered.forEach(ac => {
    if (!categories[ac.category]) categories[ac.category] = [];
    categories[ac.category].push(ac);
  });

  let optionsHtml = '';
  if (filtered.length === 0) {
    optionsHtml = '<div style="padding: 0.6rem; color: var(--text-muted); font-size: 0.8rem; text-align: center;">No matching aircraft for selected airline fleet</div>';
  } else {
    for (const [catName, acList] of Object.entries(categories)) {
      optionsHtml += `<div class="ms-category-header">${escapeHtml(catName)}</div>`;
      acList.forEach(ac => {
        const isChecked = selectedAircraft.includes(ac.code);
        optionsHtml += `
          <div class="ms-option-item ${isChecked ? 'selected' : ''}" data-code="${escapeHtml(ac.code)}">
            <input type="checkbox" class="ms-option-checkbox" ${isChecked ? 'checked' : ''} />
            <div class="ms-option-label">
              <span>${escapeHtml(ac.name)}</span>
              <span class="ms-option-tag">${escapeHtml(ac.code)}</span>
            </div>
          </div>
        `;
      });
    }
  }

  msAircraft.innerHTML = `
    <div class="ms-trigger" tabindex="0" id="ms-aircraft-trigger">
      <span class="ms-trigger-label">${escapeHtml(triggerLabel)}</span>
      <span class="ms-trigger-arrow">▼</span>
    </div>
    <div class="ms-dropdown ${msAircraft.classList.contains('open') ? '' : 'hidden'}">
      <div class="ms-search-box">
        <input type="text" class="ms-search-input" id="ms-aircraft-search" placeholder="Search aircraft (e.g. 737, 747, A380, B738)..." value="${escapeHtml(searchQuery)}" />
      </div>
      <div class="ms-actions">
        <button type="button" class="ms-btn-link" id="ms-aircraft-all">Select All</button>
        <button type="button" class="ms-btn-link" id="ms-aircraft-clear">Clear</button>
      </div>
      <div class="ms-options-list">
        ${optionsHtml}
      </div>
    </div>
  `;

  const trigger = msAircraft.querySelector('#ms-aircraft-trigger');
  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(msAircraft); });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(msAircraft); }
  });

  const searchInput = msAircraft.querySelector('#ms-aircraft-search');
  searchInput.addEventListener('input', (e) => {
    renderAircraftMultiSelect(e.target.value);
    const newInput = msAircraft.querySelector('#ms-aircraft-search');
    if (newInput) {
      newInput.focus();
      newInput.setSelectionRange(newInput.value.length, newInput.value.length);
    }
  });
  searchInput.addEventListener('click', (e) => e.stopPropagation());

  const btnAll = msAircraft.querySelector('#ms-aircraft-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAircraft = [...allowed];
    renderAircraftMultiSelect(searchInput.value);
    applyFilters();
  });

  const btnClear = msAircraft.querySelector('#ms-aircraft-clear');
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAircraft = [];
    renderAircraftMultiSelect(searchInput.value);
    applyFilters();
  });

  msAircraft.querySelectorAll('.ms-option-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = item.getAttribute('data-code');
      if (selectedAircraft.includes(code)) {
        selectedAircraft = selectedAircraft.filter(x => x !== code);
      } else {
        selectedAircraft.push(code);
      }
      renderAircraftMultiSelect(searchInput.value);
      applyFilters();
    });
  });
}

// DATA LOADING & FILTER ENGINE
async function loadFlights() {
  try {
    resultsCount.textContent = 'Loading flights...';
    const res = await fetch('./flights.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rawData = await res.json();
    
    // Normalize data model
    allFlights = rawData.map(f => {
      const depIcao = f.dep_icao || f.departure_icao || 'LZIB';
      const arrIcao = f.arr_icao || f.arrival_icao || 'EGSS';
      const depCity = f.dep_city || f.departure_city || depIcao;
      const arrCity = f.arr_city || f.arrival_city || arrIcao;
      const depCountry = f.dep_country || f.departure_country || '';
      const arrCountry = f.arr_country || f.arrival_country || '';
      const depTime = f.dep_time_local || f.departure_time || '08:00';
      const arrTime = f.arr_time_local || f.arrival_time || '10:00';
      const depUtc = f.departure_time_utc || f.dep_time_utc || depTime;
      const arrUtc = f.arrival_time_utc || f.arr_time_utc || arrTime;
      const depLat = f.dep_lat ?? f.departure_lat ?? 48.17;
      const depLon = f.dep_lon ?? f.departure_lon ?? 17.21;
      const arrLat = f.arr_lat ?? f.arrival_lat ?? 51.88;
      const arrLon = f.arr_lon ?? f.arrival_lon ?? 0.23;
      const dist = f.distance_nm || calcDistanceNm(depLat, depLon, arrLat, arrLon);
      const days = f.days_of_week || f.days_of_operation || [1, 2, 3, 4, 5, 6, 7];

      return {
        ...f,
        airline: f.airline || 'Ryanair',
        airline_icao: f.airline_icao || 'RYR',
        airline_iata: f.airline_iata || 'FR',
        aircraft_type: f.aircraft_type || 'B738',
        flight_number: f.flight_number || (f.airline_iata ? f.airline_iata + ' ' + (f.callsign || '2315') : 'FR 2315'),
        callsign: f.callsign || f.flight_number || 'RYR2315',
        dep_icao: depIcao,
        departure_icao: depIcao,
        arr_icao: arrIcao,
        arrival_icao: arrIcao,
        dep_iata: f.dep_iata || f.departure_iata || '',
        arr_iata: f.arr_iata || f.arrival_iata || '',
        dep_city: depCity,
        departure_city: depCity,
        arr_city: arrCity,
        arrival_city: arrCity,
        dep_country: depCountry,
        arr_country: arrCountry,
        dep_time_local: depTime,
        arr_time_local: arrTime,
        dep_time_utc: depUtc,
        arr_time_utc: arrUtc,
        homebase: f.homebase || depIcao,
        dep_lat: depLat,
        dep_lon: depLon,
        arr_lat: arrLat,
        arr_lon: arrLon,
        distance_nm: dist,
        duration_minutes: f.duration_minutes || 90,
        days_of_week: days,
        days_of_operation: days
      };
    });

    applyFilters();
  } catch (err) {
    console.error('Error loading flights:', err);
    resultsCount.textContent = 'Error loading flights';
  }
}

function setupEventListeners() {
  // Day of week buttons
  document.querySelectorAll('.vff-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vff-day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.getAttribute('data-day');
      currentDay = val === 'all' ? 'all' : parseInt(val, 10);
      currentPage = 1;
      applyFilters();
    });
  });

  // Search Inputs
  [searchDep, searchArr, filterCallsign, sortBy].forEach(el => {
    if (el) el.addEventListener('input', () => { currentPage = 1; applyFilters(); });
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  });

  // Swap Route Button
  if (btnSwapRoute) {
    btnSwapRoute.addEventListener('click', () => {
      const temp = searchDep.value;
      searchDep.value = searchArr.value;
      searchArr.value = temp;
      currentPage = 1;
      applyFilters();
    });
  }

  // Duration Slider
  if (filterDuration) {
    filterDuration.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 360) {
        durationLabel.textContent = 'Any duration';
      } else {
        const h = Math.floor(val / 60);
        const m = val % 60;
        durationLabel.textContent = `Max ${h}h ${m > 0 ? m + 'm' : ''}`;
      }
      currentPage = 1;
      applyFilters();
    });
  }

  // Reset Filters Button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (searchDep) searchDep.value = '';
      if (searchArr) searchArr.value = '';
      if (filterCallsign) filterCallsign.value = '';
      if (filterDuration) {
        filterDuration.value = 360;
        durationLabel.textContent = 'Any duration';
      }
      if (sortBy) sortBy.value = 'time';

      selectedAirlines = [];
      selectedAircraft = [];
      currentDay = 'all';

      document.querySelectorAll('.vff-day-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-day') === 'all');
      });

      syncAircraftAvailability();
      renderAirlineMultiSelect();
      renderAircraftMultiSelect();

      currentPage = 1;
      applyFilters();
    });
  }

  // Pagination buttons
  if (btnPageFirst) btnPageFirst.addEventListener('click', () => goToPage(1));
  if (btnPagePrev) btnPagePrev.addEventListener('click', () => goToPage(currentPage - 1));
  if (btnPageNext) btnPageNext.addEventListener('click', () => goToPage(currentPage + 1));
  if (btnPageLast) btnPageLast.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredFlights.length / PAGE_SIZE) || 1;
    goToPage(totalPages);
  });

  // Globe Modal
  if (btnGlobeMap) btnGlobeMap.addEventListener('click', openGlobeModal);
  if (globeModalClose) globeModalClose.addEventListener('click', closeGlobeModal);
  if (globeModal) {
    globeModal.addEventListener('click', (e) => {
      if (e.target === globeModal) closeGlobeModal();
    });
  }

  // Flight Modal Close
  if (modalClose) modalClose.addEventListener('click', closeFlightModal);
  if (flightModal) {
    flightModal.addEventListener('click', (e) => {
      if (e.target === flightModal) closeFlightModal();
    });
  }
}

function closeFlightModal() {
  if (flightModal) flightModal.classList.add('hidden');
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function applyFilters() {
  const depTerm = (searchDep?.value || '').trim().toUpperCase();
  const arrTerm = (searchArr?.value || '').trim().toUpperCase();
  const callsignTerm = (filterCallsign?.value || '').trim().toUpperCase();
  const maxDur = parseInt(filterDuration?.value || '360', 10);
  const sortOption = sortBy?.value || 'time';

  filteredFlights = allFlights.filter(f => {
    // Operating Day
    if (currentDay !== 'all') {
      const days = f.days_of_week || [1, 2, 3, 4, 5, 6, 7];
      if (!days.includes(currentDay)) return false;
    }

    // Airlines Multi-Select
    if (selectedAirlines.length > 0) {
      if (!selectedAirlines.includes(f.airline)) return false;
    }

    // Aircraft Types Multi-Select
    if (selectedAircraft.length > 0) {
      const type = f.aircraft_type || 'B738';
      if (!selectedAircraft.includes(type)) return false;
    }

    // Origin Dep Airport (ICAO, IATA, City, Country)
    if (depTerm) {
      const depMatch = (f.dep_icao && f.dep_icao.includes(depTerm)) ||
                       (f.dep_iata && f.dep_iata.includes(depTerm)) ||
                       (f.dep_city && f.dep_city.toUpperCase().includes(depTerm)) ||
                       (f.dep_country && f.dep_country.toUpperCase().includes(depTerm));
      if (!depMatch) return false;
    }

    // Destination Arr Airport (ICAO, IATA, City, Country)
    if (arrTerm) {
      const arrMatch = (f.arr_icao && f.arr_icao.includes(arrTerm)) ||
                       (f.arr_iata && f.arr_iata.includes(arrTerm)) ||
                       (f.arr_city && f.arr_city.toUpperCase().includes(arrTerm)) ||
                       (f.arr_country && f.arr_country.toUpperCase().includes(arrTerm));
      if (!arrMatch) return false;
    }

    // Callsign or Flight Number
    if (callsignTerm) {
      const csMatch = (f.callsign && f.callsign.toUpperCase().includes(callsignTerm)) ||
                      (f.flight_number && f.flight_number.toUpperCase().includes(callsignTerm));
      if (!csMatch) return false;
    }

    // Max Duration
    if (maxDur < 360 && f.duration_minutes > maxDur) {
      return false;
    }

    return true;
  });

  // Sort
  if (sortOption === 'duration-asc') {
    filteredFlights.sort((a, b) => a.duration_minutes - b.duration_minutes);
  } else if (sortOption === 'duration-desc') {
    filteredFlights.sort((a, b) => b.duration_minutes - a.duration_minutes);
  } else {
    filteredFlights.sort((a, b) => (a.dep_time_local || '99:99').localeCompare(b.dep_time_local || '99:99'));
  }

  // Update Page & Render
  const totalPages = Math.ceil(filteredFlights.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = 1;

  resultsCount.textContent = `${filteredFlights.length.toLocaleString()} Flights Found`;
  renderFlights();
  renderPagination();
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredFlights.length / PAGE_SIZE) || 1;
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderFlights();
  renderPagination();

  const mainContent = document.querySelector('.vff-main-content');
  if (mainContent) mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination() {
  if (!paginationContainer) return;
  const totalItems = filteredFlights.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  if (totalItems === 0) {
    paginationContainer.classList.add('hidden');
    return;
  }
  paginationContainer.classList.remove('hidden');

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${totalItems.toLocaleString()} flights (Page ${currentPage} of ${totalPages})`;
  }

  if (btnPageFirst) btnPageFirst.disabled = currentPage === 1;
  if (btnPagePrev) btnPagePrev.disabled = currentPage === 1;
  if (btnPageNext) btnPageNext.disabled = currentPage === totalPages;
  if (btnPageLast) btnPageLast.disabled = currentPage === totalPages;

  if (pageNumbersContainer) {
    let pagesHtml = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      pagesHtml += `<button class="btn-page" data-page="1">1</button>`;
      if (startPage > 2) pagesHtml += `<span class="page-ellipsis">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      pagesHtml += `<button class="btn-page ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pagesHtml += `<span class="page-ellipsis">...</span>`;
      pagesHtml += `<button class="btn-page" data-page="${totalPages}">${totalPages}</button>`;
    }

    pageNumbersContainer.innerHTML = pagesHtml;
    pageNumbersContainer.querySelectorAll('.btn-page').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPage = parseInt(btn.getAttribute('data-page'), 10);
        goToPage(targetPage);
      });
    });
  }
}

function getAirlineCssClass(airlineName) {
  const norm = (airlineName || '').toLowerCase();
  if (norm.includes('ryanair')) return 'airline-ryanair';
  if (norm.includes('wizz')) return 'airline-wizz-air';
  if (norm.includes('easyjet')) return 'airline-easyjet';
  if (norm.includes('lufthansa')) return 'airline-lufthansa';
  if (norm.includes('british')) return 'airline-british-airways';
  if (norm.includes('klm')) return 'airline-klm';
  if (norm.includes('smartwings')) return 'airline-smartwings';
  if (norm.includes('austrian')) return 'airline-austrian-airlines';
  if (norm.includes('emirates')) return 'airline-emirates';
  if (norm.includes('qatar')) return 'airline-qatar-airways';
  return 'airline-ryanair';
}

function getBadgeColorClass(icao) {
  switch (icao) {
    case 'RYR': return 'badge-ryr';
    case 'WZZ': return 'badge-wzz';
    case 'EZY': return 'badge-ezy';
    case 'DLH': return 'badge-dlh';
    case 'BAW': return 'badge-baw';
    case 'KLM': return 'badge-klm';
    case 'TVS': return 'badge-tvs';
    case 'AUA': return 'badge-aua';
    case 'UAE': return 'badge-uae';
    case 'QTR': return 'badge-qtr';
    default: return 'badge-ryr';
  }
}

function renderFlights() {
  if (!flightsGrid) return;
  flightsGrid.innerHTML = '';

  if (filteredFlights.length === 0) {
    flightsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted);">
        <h3 style="font-size: 1.2rem; color: var(--text-main); margin-bottom: 0.5rem;">No flights found</h3>
        <p>Try adjusting your search criteria or resetting filters.</p>
      </div>
    `;
    return;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageFlights = filteredFlights.slice(startIndex, startIndex + PAGE_SIZE);
  const fragment = document.createDocumentFragment();

  pageFlights.forEach(f => {
    const card = document.createElement('div');
    const airlineClass = getAirlineCssClass(f.airline);
    const badgeClass = getBadgeColorClass(f.airline_icao);
    card.className = `flight-card ${airlineClass}`;
    card.setAttribute('data-id', f.id || `${f.callsign}-${f.dep_icao}-${f.arr_icao}`);

    const durH = Math.floor(f.duration_minutes / 60);
    const durM = f.duration_minutes % 60;
    const durStr = `${durH}h ${durM < 10 ? '0' : ''}${durM}m`;

    card.innerHTML = `
      <div class="fc-header">
        <div class="fc-airline-pill ${badgeClass}">
          ${escapeHtml(f.airline || 'Ryanair')}
        </div>
        <div class="fc-identifiers">
          <span class="badge homebase-badge" title="Homebase Airport">Base: ${escapeHtml(f.homebase || f.dep_icao)}</span>
          <span class="badge callsign">${escapeHtml(f.callsign || f.flight_number)}</span>
          ${f.flight_number && f.flight_number !== f.callsign ? `<span class="badge">${escapeHtml(f.flight_number)}</span>` : ''}
          <span class="badge" style="background: rgba(var(--color-accent-rgb), 0.15); color: var(--color-accent);">${escapeHtml(f.aircraft_type || 'B738')}</span>
        </div>
      </div>

      <div class="fc-route">
        <div class="fc-point">
          <div class="fc-time">${escapeHtml(f.dep_time_local || '--:--')}</div>
          <div class="fc-time-sub">${escapeHtml(f.dep_time_utc || '--:--')} UTC</div>
          <div class="fc-icao">${escapeHtml(f.dep_icao)} ${f.dep_iata ? `(${escapeHtml(f.dep_iata)})` : ''}</div>
          <div class="fc-city" title="${escapeHtml(f.dep_city)}, ${escapeHtml(f.dep_country)}">${escapeHtml(f.dep_city || '')}</div>
        </div>

        <div class="fc-divider">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
        </div>

        <div class="fc-point right">
          <div class="fc-time">${escapeHtml(f.arr_time_local || '--:--')}</div>
          <div class="fc-time-sub">${escapeHtml(f.arr_time_utc || '--:--')} UTC</div>
          <div class="fc-icao">${escapeHtml(f.arr_icao)} ${f.arr_iata ? `(${escapeHtml(f.arr_iata)})` : ''}</div>
          <div class="fc-city" title="${escapeHtml(f.arr_city)}, ${escapeHtml(f.arr_country)}">${escapeHtml(f.arr_city || '')}</div>
        </div>
      </div>

      <div class="fc-footer">
        <div class="fc-duration">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>${durStr} • ${f.distance_nm || '—'} NM</span>
        </div>
        <div class="fc-days">
          ${[1,2,3,4,5,6,7].map(d => {
            const active = (f.days_of_week || []).includes(d);
            const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            return `<span class="day-dot ${active ? 'active' : ''}">${labels[d-1]}</span>`;
          }).join('')}
        </div>
      </div>
    `;

    card.addEventListener('click', () => openFlightModal(f));
    fragment.appendChild(card);
  });

  flightsGrid.appendChild(fragment);
}

// GLOBE / WORLD ROUTE MAP MODAL
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
      center: [50.0, 15.0],
      zoom: 4,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: true
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; CARTO, &copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(globeMap);
  } else {
    globeMap.invalidateSize();
  }

  globePolylines.forEach(layer => globeMap.removeLayer(layer));
  globePolylines = [];

  filteredFlights.forEach(f => {
    const depLat = f.dep_lat || f.departure_lat;
    const depLon = f.dep_lon || f.departure_lon;
    const arrLat = f.arr_lat || f.arrival_lat;
    const arrLon = f.arr_lon || f.arrival_lon;

    if (depLat && depLon && arrLat && arrLon) {
      const color = getAirlineColor(f.airline_icao);
      const line = L.polyline([[depLat, depLon], [arrLat, arrLon]], {
        color: color,
        weight: 2,
        opacity: 0.65,
        smoothFactor: 1
      });

      line.bindTooltip(`<strong>${escapeHtml(f.callsign || f.flight_number)}</strong> (${escapeHtml(f.airline)})<br>${escapeHtml(f.dep_icao)} (${escapeHtml(f.dep_city)}) ➔ ${escapeHtml(f.arr_icao)} (${escapeHtml(f.arr_city)})<br>Aircraft: ${escapeHtml(f.aircraft_type || 'B738')}`, {
        sticky: true
      });

      line.on('click', () => {
        closeGlobeModal();
        openFlightModal(f);
      });

      line.addTo(globeMap);
      globePolylines.push(line);
    }
  });
}

function getAirlineColor(icao) {
  switch (icao) {
    case 'RYR': return '#1e3a8a';
    case 'WZZ': return '#ec4899';
    case 'EZY': return '#f97316';
    case 'DLH': return '#eab308';
    case 'BAW': return '#ef4444';
    case 'KLM': return '#06b6d4';
    case 'TVS': return '#f97316';
    case 'AUA': return '#ef4444';
    case 'UAE': return '#dc2626';
    case 'QTR': return '#a21caf';
    default: return '#00BDB1';
  }
}

// ORIGINAL RICH FLIGHT DETAIL MODAL (RESTORED COMPLETE)
async function openFlightModal(flight) {
  if (!flightModal) return;
  flightModal.classList.remove('hidden');
  modalLoading.classList.remove('hidden');
  modalBody.classList.add('hidden');

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

  // Departure & Arrival Times
  const depLocal = flight.dep_time_local || '08:00';
  const depUtc = flight.dep_time_utc || depLocal;
  const arrLocal = flight.arr_time_local || '10:00';
  const arrUtc = flight.arr_time_utc || arrLocal;

  document.getElementById('m-dep-time-local').textContent = depLocal;
  document.getElementById('m-dep-time-utc').textContent = depUtc + ' UTC';
  document.getElementById('m-dep-time-your-local').textContent = depLocal;

  document.getElementById('m-arr-time-local').textContent = arrLocal;
  document.getElementById('m-arr-time-utc').textContent = arrUtc + ' UTC';
  document.getElementById('m-arr-time-your-local').textContent = arrLocal;

  // Countdown update function
  function updateCountdowns() {
    const now = new Date();
    const [dH, dM] = depUtc.split(':').map(Number);
    const depDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), dH, dM));
    let diffMs = depDate.getTime() - now.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffS = Math.floor((diffMs % (1000 * 60)) / 1000);

    const depCountdownEl = document.getElementById('m-dep-countdown');
    if (depCountdownEl) {
      depCountdownEl.textContent = `in ${diffH}h ${diffM}m ${diffS}s`;
    }

    const arrCountdownEl = document.getElementById('m-arr-countdown');
    if (arrCountdownEl) {
      const arrMs = diffMs + (flight.duration_minutes || 90) * 60 * 1000;
      const aH = Math.floor(arrMs / (1000 * 60 * 60));
      const aM = Math.floor((arrMs % (1000 * 60 * 60)) / (1000 * 60));
      arrCountdownEl.textContent = `in ${aH}h ${aM}m`;
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

  modalLoading.classList.add('hidden');
  modalBody.classList.remove('hidden');

  setTimeout(() => {
    renderModalRouteMap(flight);
    fetchLiveWeather(flight.dep_icao, 'dep');
    fetchLiveWeather(flight.arr_icao, 'arr');
    fetchVatsimAtc(flight.dep_icao, 'dep');
    fetchVatsimAtc(flight.arr_icao, 'arr');
  }, 50);
}

function renderModalRouteMap(flight) {
  const mapContainer = document.getElementById('m-route-map');
  if (!mapContainer) return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  const depLat = flight.dep_lat || flight.departure_lat;
  const depLon = flight.dep_lon || flight.departure_lon;
  const arrLat = flight.arr_lat || flight.arrival_lat;
  const arrLon = flight.arr_lon || flight.arrival_lon;

  if (depLat && depLon && arrLat && arrLon) {
    leafletMap = L.map('m-route-map').fitBounds([
      [depLat, depLon],
      [arrLat, arrLon]
    ], { padding: [40, 40] });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(leafletMap);

    L.marker([depLat, depLon]).addTo(leafletMap).bindPopup(`<strong>${flight.dep_icao}</strong> (${flight.dep_city || ''})`);
    L.marker([arrLat, arrLon]).addTo(leafletMap).bindPopup(`<strong>${flight.arr_icao}</strong> (${flight.arr_city || ''})`);

    L.polyline([[depLat, depLon], [arrLat, arrLon]], {
      color: '#00BDB1',
      weight: 3,
      dashArray: '6, 6'
    }).addTo(leafletMap);
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
