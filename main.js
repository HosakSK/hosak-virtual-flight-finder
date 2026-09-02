/**
 * Virtual Flight Finder - Main Controller
 */

// Global State
let allFlights = [];
let filteredFlights = [];
let selectedAirlines = [];
let selectedAircraft = [];
let currentDay = 'all';
let maxDurationMins = 360;
let currentPage = 1;
const PAGE_SIZE = 100;
let leafletMap = null;
let globeMap = null;
let globePolylines = [];
let countdownTimer = null;

// Airline Definitions with Fleet data for cascading filter
const AIRLINE_DEFINITIONS = [
  { id: 'Ryanair', name: 'Ryanair', icao: 'RYR', iata: 'FR', aircraft: ['B738', 'B38M'] },
  { id: 'Wizz Air', name: 'Wizz Air', icao: 'WZZ', iata: 'W6', aircraft: ['A320', 'A321', 'A21N'] },
  { id: 'Lufthansa', name: 'Lufthansa', icao: 'DLH', iata: 'LH', aircraft: ['A319', 'A320', 'A321', 'A21N', 'A333', 'A343', 'A359', 'B744', 'B748', 'B789'] },
  { id: 'Austrian Airlines', name: 'Austrian Airlines', icao: 'AUA', iata: 'OS', aircraft: ['A320', 'A321', 'A20N', 'B763', 'B772', 'B789'] },
  { id: 'easyJet', name: 'easyJet', icao: 'EZY', iata: 'U2', aircraft: ['A319', 'A320', 'A321', 'A20N', 'A21N'] },
  { id: 'British Airways', name: 'British Airways', icao: 'BAW', iata: 'BA', aircraft: ['A319', 'A320', 'A321', 'A20N', 'A21N', 'A351', 'A388', 'B772', 'B77W', 'B788', 'B789', 'B78X'] },
  { id: 'KLM', name: 'KLM Royal Dutch Airlines', icao: 'KLM', iata: 'KL', aircraft: ['E190', 'E295', 'B737', 'B738', 'B739', 'A321', 'A21N', 'A332', 'A333', 'B772', 'B77W', 'B789', 'B78X'] },
  { id: 'Smartwings', name: 'Smartwings', icao: 'TVS', iata: 'QS', aircraft: ['B737', 'B738', 'B739', 'B38M'] },
  { id: 'Emirates', name: 'Emirates', icao: 'UAE', iata: 'EK', aircraft: ['A388', 'B772', 'B77W', 'A359'] },
  { id: 'Qatar Airways', name: 'Qatar Airways', icao: 'QTR', iata: 'QR', aircraft: ['A320', 'A332', 'A333', 'A359', 'A351', 'A388', 'B772', 'B77W', 'B788', 'B789'] }
];

// Complete Aircraft Definitions
const AIRCRAFT_DEFINITIONS = [
  { code: 'B738', name: 'Boeing 737-800' },
  { code: 'B38M', name: 'Boeing 737 MAX 8' },
  { code: 'B737', name: 'Boeing 737-700' },
  { code: 'B739', name: 'Boeing 737-900' },
  { code: 'A319', name: 'Airbus A319' },
  { code: 'A320', name: 'Airbus A320' },
  { code: 'A321', name: 'Airbus A321' },
  { code: 'A20N', name: 'Airbus A320neo' },
  { code: 'A21N', name: 'Airbus A321neo' },
  { code: 'A332', name: 'Airbus A330-200' },
  { code: 'A333', name: 'Airbus A330-300' },
  { code: 'A343', name: 'Airbus A340-300' },
  { code: 'A359', name: 'Airbus A350-900' },
  { code: 'A351', name: 'Airbus A350-1000' },
  { code: 'A388', name: 'Airbus A380-800' },
  { code: 'B744', name: 'Boeing 747-400' },
  { code: 'B748', name: 'Boeing 747-8' },
  { code: 'B763', name: 'Boeing 767-300ER' },
  { code: 'B772', name: 'Boeing 777-200ER' },
  { code: 'B77W', name: 'Boeing 777-300ER' },
  { code: 'B788', name: 'Boeing 787-8' },
  { code: 'B789', name: 'Boeing 787-9' },
  { code: 'B78X', name: 'Boeing 787-10' },
  { code: 'E190', name: 'Embraer E190' },
  { code: 'E295', name: 'Embraer E195-E2' }
];

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
const btnThemeToggle = document.getElementById('btn-theme-toggle');
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
        <button type="button" class="ms-btn-action" id="ms-airline-all">Select All</button>
        <button type="button" class="ms-btn-action" id="ms-airline-clear">Clear</button>
      </div>
      <div class="ms-options-list">
        ${filtered.map(a => {
          const checked = selectedAirlines.includes(a.id) ? 'checked' : '';
          return `
            <div class="ms-option-item ${checked ? 'selected' : ''}" data-id="${escapeHtml(a.id)}">
              <input type="checkbox" ${checked} />
              <span class="ms-option-label">${escapeHtml(a.name)} (${a.icao})</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const trigger = msAirline.querySelector('#ms-airline-trigger');
  const dropdown = msAirline.querySelector('#ms-airline-dropdown');
  const searchInput = msAirline.querySelector('#ms-airline-search');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(dropdown);
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  searchInput.addEventListener('input', (e) => {
    renderAirlineMultiSelect(e.target.value);
    const newDropdown = msAirline.querySelector('#ms-airline-dropdown');
    newDropdown.classList.remove('hidden');
    const newSearch = msAirline.querySelector('#ms-airline-search');
    newSearch.focus();
  });

  const btnAll = msAirline.querySelector('#ms-airline-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAirlines = [...allowed];
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
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
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
        <input type="text" id="ms-aircraft-search" placeholder="Search aircraft (e.g. B738, A320)..." value="${escapeHtml(searchQuery)}" autocomplete="off" />
      </div>
      <div class="ms-actions">
        <button type="button" class="ms-btn-action" id="ms-aircraft-all">Select All</button>
        <button type="button" class="ms-btn-action" id="ms-aircraft-clear">Clear</button>
      </div>
      <div class="ms-options-list">
        ${filtered.map(a => {
          const checked = selectedAircraft.includes(a.code) ? 'checked' : '';
          return `
            <div class="ms-option-item ${checked ? 'selected' : ''}" data-code="${escapeHtml(a.code)}">
              <input type="checkbox" ${checked} />
              <span class="ms-option-label"><strong>${escapeHtml(a.code)}</strong> - ${escapeHtml(a.name)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  const trigger = msAircraft.querySelector('#ms-aircraft-trigger');
  const dropdown = msAircraft.querySelector('#ms-aircraft-dropdown');
  const searchInput = msAircraft.querySelector('#ms-aircraft-search');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns(dropdown);
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      searchInput.focus();
    }
  });

  searchInput.addEventListener('input', (e) => {
    renderAircraftMultiSelect(e.target.value);
    const newDropdown = msAircraft.querySelector('#ms-aircraft-dropdown');
    newDropdown.classList.remove('hidden');
    const newSearch = msAircraft.querySelector('#ms-aircraft-search');
    newSearch.focus();
  });

  const btnAll = msAircraft.querySelector('#ms-aircraft-all');
  btnAll.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAircraft = [...allowed];
    syncAirlineAvailability();
    renderAircraftMultiSelect(searchInput.value);
    applyFilters();
  });

  const btnClear = msAircraft.querySelector('#ms-aircraft-clear');
  btnClear.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAircraft = [];
    syncAirlineAvailability();
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
      syncAirlineAvailability();
      renderAircraftMultiSelect(searchInput.value);
      applyFilters();
    });
  });
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
      const depText = [f.dep_icao, f.dep_iata, f.dep_city, f.dep_country].filter(Boolean).join(' ').toLowerCase();
      if (!depText.includes(depQ)) return false;
    }

    // Arrival filter
    if (arrQ) {
      const arrText = [f.arr_icao, f.arr_iata, f.arr_city, f.arr_country].filter(Boolean).join(' ').toLowerCase();
      if (!arrText.includes(arrQ)) return false;
    }

    // Callsign / Flight number filter
    if (callsignQ) {
      const csText = [f.callsign, f.flight_number, f.airline].filter(Boolean).join(' ').toLowerCase();
      if (!csText.includes(callsignQ)) return false;
    }

    // Max Duration slider
    if (maxDurationMins && f.duration_minutes > maxDurationMins) {
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
      if (flightDay !== targetDay) {
        const days = (f.days_of_week || f.days_of_operation || []).map(d => d === 0 ? 7 : d);
        if (!days.includes(targetDay)) return false;
      }
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
  if (searchDep) searchDep.addEventListener('input', debounce(applyFilters, 300));
  if (searchArr) searchArr.addEventListener('input', debounce(applyFilters, 300));
  if (filterCallsign) filterCallsign.addEventListener('input', debounce(applyFilters, 300));
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
      maxDurationMins = val;
      if (durationLabel) {
        if (val >= 360) {
          durationLabel.textContent = 'Any duration';
          maxDurationMins = null;
        } else {
          const h = Math.floor(val / 60);
          const m = val % 60;
          durationLabel.textContent = `≤ ${h}h ${m > 0 ? m + 'm' : ''}`;
        }
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
        filterDuration.value = '360';
        maxDurationMins = null;
        if (durationLabel) durationLabel.textContent = 'Any duration';
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

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                 document.body.classList.contains('theme-dark');
  
  const tileUrl = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  if (!globeMap) {
    globeMap = L.map('globe-map', {
      center: [48.17, 17.21],
      zoom: 4,
      minZoom: 2,
      maxZoom: 16
    });

    L.tileLayer(tileUrl, {
      attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
      maxZoom: 16
    }).addTo(globeMap);
  } else {
    globeMap.eachLayer(layer => {
      if (layer instanceof L.TileLayer) globeMap.removeLayer(layer);
    });
    L.tileLayer(tileUrl, { maxZoom: 16 }).addTo(globeMap);
  }

  globeMap.invalidateSize();

  // Clear existing polylines
  globePolylines.forEach(layer => globeMap.removeLayer(layer));
  globePolylines = [];

  // Add route lines for current filtered flights
  filteredFlights.slice(0, 300).forEach(f => {
    const depLat = f.dep_lat || f.departure_lat;
    const depLon = f.dep_lon || f.departure_lon;
    const arrLat = f.arr_lat || f.arrival_lat;
    const arrLon = f.arr_lon || f.arrival_lon;

    if (depLat && depLon && arrLat && arrLon) {
      const line = L.polyline([[depLat, depLon], [arrLat, arrLon]], {
        color: '#00BDB1',
        weight: 1.5,
        opacity: 0.4
      });
      line.bindPopup(`<strong>${escapeHtml(f.callsign || f.flight_number)}</strong>: ${f.dep_icao} ➔ ${f.arr_icao} (${f.aircraft_type || 'B738'})`);
      line.addTo(globeMap);
      globePolylines.push(line);
    }
  });
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

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                   document.body.classList.contains('theme-dark');
    
    const tileUrl = isDark
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, {
      attribution: '&copy; Esri, OpenStreetMap',
      maxZoom: 16
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
