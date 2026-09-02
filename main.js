let allFlights = [];
let lastRenderedFlights = [];
let globeMapInstance = null;
let globeLayerGroup = null;

const DOM = {
  grid: document.getElementById('flights-grid'),
  count: document.getElementById('results-count'),
  filterAirline: document.getElementById('filter-airline'),
  filterAircraft: document.getElementById('filter-aircraft'),
  filterOrigin: document.getElementById('filter-origin'),
  filterDest: document.getElementById('filter-dest'),
  btnSwap: document.getElementById('btn-swap-route'),
  simFilters: document.getElementById('sim-filters'),
  liveFilters: document.getElementById('live-filters'),
  filterDay: document.getElementById('filter-day'),
  filterTimeFrom: document.getElementById('filter-time-from'),
  filterTimeTo: document.getElementById('filter-time-to'),
  filterHours: document.getElementById('filter-hours'),
  hoursLabel: document.getElementById('hours-label'),
  filterDuration: document.getElementById('filter-duration'),
  durationLabel: document.getElementById('duration-label'),
  filterDurationMin: document.getElementById('filter-duration-min'),
  durationMinLabel: document.getElementById('duration-min-label'),
  filterHomebase: document.getElementById('filter-homebase'),
  filterCallsign: document.getElementById('filter-callsign'),
  sortBy: document.getElementById('sort-by'),
  resetBtn: document.getElementById('reset-filters'),
  showUtc: document.getElementById('show-utc'),
  toast: document.getElementById('toast'),
  btnTheme: document.getElementById('theme-toggle'),
  btnGlobe: document.getElementById('btn-globe-map'),
  globeModal: document.getElementById('globe-modal'),
  globeModalClose: document.getElementById('globe-modal-close'),
  globeMap: document.getElementById('globe-map'),
  globeRoutesCount: document.getElementById('globe-routes-count'),
  lastUpdatedText: document.getElementById('last-updated-text')
};

const AIRLINE_COLORS = {
  'Ryanair': '#f1c40f',
  'Wizz Air': '#ff66cc',
  'easyJet': '#ff6600',
  'Lufthansa': '#ffba00',
  'British Airways': '#5dade2',
  'KLM': '#00d2ff',
  'Smartwings': '#ff9955',
  'Austrian Airlines': '#ff5555',
  'Emirates': '#d71921',
  'Qatar Airways': '#a61d62'
};

async function init() {
  initTheme();
  try {
    const res = await fetch('./flights.json').catch(() => fetch('/flights.json')).catch(() => fetch('./ryanair_flights_lzib.json')).catch(() => fetch('/finder/ryanair_flights_lzib.json'));
    allFlights = await res.json();

    // Fetch last updated timestamp
    try {
      const metaRes = await fetch('./metadata.json').catch(() => fetch('/metadata.json'));
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (DOM.lastUpdatedText && meta.last_updated_formatted) {
          DOM.lastUpdatedText.textContent = `Last updated: ${meta.last_updated_formatted}`;
        }
      }
    } catch (e) {
      console.log('Using default metadata timestamp');
    }

    setupListeners();
    setupGlobeModal();
    applyFilters();
  } catch (err) {
    DOM.count.textContent = 'Error loading flights data.';
    console.error(err);
  }
}

function showToast(msg) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.add('show');
  DOM.toast.classList.remove('hidden');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2000);
}

function initTheme() {
  const savedTheme = localStorage.getItem('finder-theme');
  const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const iconMoon = document.getElementById('theme-icon-moon');
  const iconSun = document.getElementById('theme-icon-sun');
  if (!iconMoon || !iconSun) return;
  
  if (isDark) {
    iconMoon.classList.add('hidden');
    iconSun.classList.remove('hidden');
  } else {
    iconSun.classList.add('hidden');
    iconMoon.classList.remove('hidden');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('finder-theme', 'light');
    updateThemeIcon(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('finder-theme', 'dark');
    updateThemeIcon(true);
  }
}

function setupListeners() {
  const inputs = [
    DOM.filterAirline, DOM.filterAircraft,
    DOM.filterOrigin, DOM.filterDest,
    DOM.filterDay, DOM.filterTimeFrom, DOM.filterTimeTo,
    DOM.filterHours, DOM.filterDuration, DOM.filterDurationMin, DOM.filterHomebase,
    DOM.filterCallsign, DOM.sortBy, DOM.showUtc
  ];

  inputs.forEach(el => {
    if (el) {
      el.addEventListener('input', applyFilters);
      el.addEventListener('change', applyFilters);
    }
  });

  // Update --range-fill CSS variable for gradient track highlight
  function updateRangeFill(el) {
    const min = parseFloat(el.min) || 0;
    const max = parseFloat(el.max) || 100;
    const val = parseFloat(el.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    el.style.setProperty('--range-fill', `${pct}%`);
  }

  [DOM.filterHours, DOM.filterDuration, DOM.filterDurationMin].forEach(el => {
    if (el) {
      updateRangeFill(el);
      el.addEventListener('input', () => updateRangeFill(el));
    }
  });

  if (DOM.btnSwap) {
    DOM.btnSwap.addEventListener('click', () => {
      const temp = DOM.filterOrigin.value;
      DOM.filterOrigin.value = DOM.filterDest.value;
      DOM.filterDest.value = temp;
      applyFilters();
    });
  }

  if (DOM.btnTheme) {
    DOM.btnTheme.addEventListener('click', toggleTheme);
  }

  DOM.filterHours.addEventListener('input', (e) => {
    const v = e.target.value;
    DOM.hoursLabel.textContent = v === '168' ? 'Departing: Any time' : `Departing in next ${v} hours`;
  });

  DOM.filterDuration.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    if (v >= 360) {
      DOM.durationLabel.textContent = 'Max Duration: Any';
    } else {
      const h = Math.floor(v / 60);
      const m = v % 60;
      DOM.durationLabel.textContent = `Max Duration: ${h}h ${m === 0 ? '00' : m}m`;
    }
  });

  DOM.filterDurationMin.addEventListener('input', (e) => {
    const v = parseInt(e.target.value);
    if (v === 0) {
      DOM.durationMinLabel.textContent = 'Min Duration: 0m';
    } else {
      const h = Math.floor(v / 60);
      const m = v % 60;
      DOM.durationMinLabel.textContent = `Min Duration: ${h}h ${m === 0 ? '00' : m}m`;
    }
  });

  DOM.resetBtn.addEventListener('click', () => {
    inputs.forEach(el => {
      if (!el) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'range') {
        if (el.id === 'filter-hours') el.value = 168;
        if (el.id === 'filter-duration') el.value = 360;
        if (el.id === 'filter-duration-min') el.value = 0;
      }
      else if (el.type === 'checkbox') el.checked = true;
      else el.value = '';
    });
    [DOM.filterHours, DOM.filterDuration, DOM.filterDurationMin].forEach(el => {
      if (el) updateRangeFill(el);
    });
    DOM.hoursLabel.textContent = 'Departing: Any time';
    DOM.durationLabel.textContent = 'Max Duration: Any';
    DOM.durationMinLabel.textContent = 'Min Duration: 0m';
    applyFilters();
  });
}

function getUtcDay(localDay, localTime, utcTime) {
  if (!localTime || !utcTime || localTime === '--:--' || utcTime === '--:--') return localDay;
  const [lh, lm] = localTime.split(':').map(Number);
  const [uh, um] = utcTime.split(':').map(Number);
  
  let lMins = lh * 60 + lm;
  let uMins = uh * 60 + um;
  
  let diff = lMins - uMins;
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  
  let utcDay = localDay;
  if (diff > 0 && lMins < diff) {
    utcDay = localDay - 1;
    if (utcDay < 1) utcDay = 7;
  } else if (diff < 0 && (24 * 60 - lMins) < Math.abs(diff)) {
    utcDay = localDay + 1;
    if (utcDay > 7) utcDay = 1;
  }
  return utcDay;
}

function getNextDepartureMinutes(flightDayOps, departureTimeStr) {
  const now = new Date();
  let currentDay = now.getUTCDay();
  if (currentDay === 0) currentDay = 7;
  
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [depH, depM] = departureTimeStr.split(':').map(Number);
  const depMinutes = depH * 60 + depM;

  let minWait = Infinity;

  for (const fDay of flightDayOps) {
    let daysDiff = fDay - currentDay;
    if (daysDiff < 0) daysDiff += 7;
    
    let totalWaitMinutes = (daysDiff * 24 * 60) + (depMinutes - currentMinutes);
    
    if (totalWaitMinutes < 0) {
      totalWaitMinutes += 7 * 24 * 60;
    }

    if (totalWaitMinutes < minWait) {
      minWait = totalWaitMinutes;
    }
  }
  return minWait;
}

function parseTime(timeStr) {
  if (!timeStr || timeStr === '--:--') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getOffsetString(localTime, utcTime) {
  if (!localTime || !utcTime || localTime === '--:--' || utcTime === '--:--') return '';
  const [lh, lm] = localTime.split(':').map(Number);
  const [uh, um] = utcTime.split(':').map(Number);
  
  let lMins = lh * 60 + lm;
  let uMins = uh * 60 + um;
  
  let diff = lMins - uMins;
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  
  const sign = diff >= 0 ? '+' : '-';
  const absDiff = Math.abs(diff);
  const h = Math.floor(absDiff / 60);
  const m = absDiff % 60;
  
  return `UTC${sign}${h}${m === 0 ? '' : ':' + m.toString().padStart(2, '0')}`;
}

function applyFilters() {
  const selectedAirline = (DOM.filterAirline ? DOM.filterAirline.value : '').toLowerCase().trim();
  const selectedAircraft = (DOM.filterAircraft ? DOM.filterAircraft.value : '').toUpperCase().trim();

  const originStr = DOM.filterOrigin.value.toLowerCase();
  const origins = originStr ? originStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const destStr = DOM.filterDest.value.toLowerCase();
  const dests = destStr ? destStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const durationMax = parseInt(DOM.filterDuration.value);
  const durationMin = parseInt(DOM.filterDurationMin.value);
  const homebase = DOM.filterHomebase.value.toLowerCase();
  const callsign = DOM.filterCallsign.value.toLowerCase();
  const hVal = parseInt(DOM.filterHours.value);
  
  let results = allFlights.filter(f => {
    // 1. Airline Filter
    if (selectedAirline) {
      const aVal = (f.airline || '').toLowerCase();
      if (!aVal.includes(selectedAirline)) return false;
    }

    // 2. Aircraft Type Filter
    if (selectedAircraft) {
      const acVal = (f.aircraft_type || 'B738').toUpperCase();
      if (acVal !== selectedAircraft) return false;
    }

    if (origins.length > 0) {
      const match = origins.some(o => 
        f.departure_icao.toLowerCase().includes(o) || 
        f.departure_city.toLowerCase().includes(o) || 
        (f.departure_country && f.departure_country.toLowerCase().includes(o))
      );
      if (!match) return false;
    }

    if (dests.length > 0) {
      const match = dests.some(d => 
        f.arrival_icao.toLowerCase().includes(d) || 
        f.arrival_city.toLowerCase().includes(d) ||
        (f.arrival_country && f.arrival_country.toLowerCase().includes(d))
      );
      if (!match) return false;
    }

    if (durationMax < 360 && f.duration_minutes > durationMax) return false;
    if (durationMin > 0 && f.duration_minutes < durationMin) return false;

    if (homebase && !(f.homebase && f.homebase.toLowerCase().includes(homebase))) return false;

    const fnNoSpace = (f.flight_number || '').replace(/\s+/g, '').toLowerCase();
    if (callsign) {
      const cs = (f.callsign || '').toLowerCase();
      if (!fnNoSpace.includes(callsign) && !cs.includes(callsign)) return false;
    }

    // Sim Filters
    const sDay = parseInt(DOM.filterDay.value);
    const fUtcDay = getUtcDay(f.day_of_operation, f.departure_time, f.departure_time_utc);
    if (sDay && fUtcDay !== sDay) return false;

    const tFrom = parseTime(DOM.filterTimeFrom.value);
    const tTo = parseTime(DOM.filterTimeTo.value);
    const depTUtc = parseTime(f.departure_time_utc);

    if (DOM.filterTimeFrom.value && depTUtc < tFrom) return false;
    if (DOM.filterTimeTo.value && depTUtc > tTo) return false;

    // Live Filter
    const wait = getNextDepartureMinutes([fUtcDay], f.departure_time_utc);
    if (hVal < 168) {
      const maxWaitMinutes = hVal * 60;
      if (wait > maxWaitMinutes) return false;
    }
    f._liveWait = wait;

    return true;
  });

  // Sort
  const sortMode = DOM.sortBy.value;
  results.sort((a, b) => {
    if (sortMode === 'duration-asc') return a.duration_minutes - b.duration_minutes;
    if (sortMode === 'duration-desc') return b.duration_minutes - a.duration_minutes;
    // Default time sort
    return parseTime(a.departure_time_utc) - parseTime(b.departure_time_utc);
  });

  render(results);
  if (DOM.globeModal && !DOM.globeModal.classList.contains('hidden')) {
    renderGlobeRoutes(results);
  }
}

function render(flights) {
  DOM.count.textContent = `Found ${flights.length} flights`;

  if (flights.length === 0) {
    DOM.grid.innerHTML = `<div class="no-results">No flights match your criteria. Try adjusting the filters.</div>`;
    return;
  }

  const showUtc = DOM.showUtc.checked;

  const html = flights.map((f, index) => {
    let daysHtml = '';
    const fUtcDay = getUtcDay(f.day_of_operation, f.departure_time, f.departure_time_utc);
    const fUtcDaysOfOp = (f.days_of_operation || []).map(d => getUtcDay(d, f.departure_time, f.departure_time_utc));
    for (let i = 1; i <= 7; i++) {
      let activeClass = '';
      if (fUtcDay === i) {
        activeClass = 'active active-primary';
      } else if (fUtcDaysOfOp.includes(i)) {
        activeClass = 'active active-secondary';
      }
      const letter = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i-1];
      daysHtml += `<div class="day-dot ${activeClass}">${letter}</div>`;
    }

    const depLocal = f.departure_time;
    const depUtc = f.departure_time_utc || '--:--';
    const arrLocal = f.arrival_time;
    const arrUtc = f.arrival_time_utc || '--:--';
    
    const depOffset = getOffsetString(depLocal, depUtc);
    const arrOffset = getOffsetString(arrLocal, arrUtc);

    const mainDep = showUtc ? depUtc : depLocal;
    const subDep = showUtc 
      ? `Local: ${depLocal} <span style="opacity: 0.6">(${depOffset})</span>` 
      : `UTC: ${depUtc} <span style="opacity: 0.6">(${depOffset})</span>`;

    const mainArr = showUtc ? arrUtc : arrLocal;
    const subArr = showUtc 
      ? `Local: ${arrLocal} <span style="opacity: 0.6">(${arrOffset})</span>` 
      : `UTC: ${arrUtc} <span style="opacity: 0.6">(${arrOffset})</span>`;
    
    const fnClean = (f.flight_number || '').replace(/\s+/g, '');
    const airlineClass = 'airline-' + (f.airline || 'ryanair').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const acType = f.aircraft_type || 'B738';

    return `
      <div class="flight-card ${airlineClass}" data-flight-index="${index}">
        <div class="fc-header">
          <div class="fc-airline" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span class="fc-airline-pill">${f.airline || 'RYANAIR'}</span>
            <span class="fc-ac-type">${acType}</span>
            <span style="opacity: 0.7; font-size: 0.72rem; margin-left: 0.2rem;">${f.homebase ? '• BASE: ' + f.homebase : ''}</span>
          </div>
          <div class="fc-identifiers">
            <span class="badge copy-click" data-copy="${fnClean}" title="Click to copy">${fnClean}</span>
            ${f.callsign ? `<span class="badge callsign copy-click" data-copy="${f.callsign}" title="Click to copy">${f.callsign}</span>` : ''}
          </div>
        </div>
        
        <div class="fc-route">
          <div class="fc-point">
            <div class="fc-time">${mainDep}</div>
            <div class="fc-time-sub">${subDep}</div>
            <div class="fc-icao copy-click" data-copy="${f.departure_icao}" title="Click to copy">${f.departure_icao}</div>
            <div class="fc-city">
              ${f.departure_city.length + f.departure_country.length > 22 
                ? `<marquee behavior="scroll" direction="left" scrollamount="3" scrolldelay="30"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.departure_city + ', ' + f.departure_country)}" target="_blank" class="city-link">${f.departure_city}, ${f.departure_country}</a></marquee>`
                : `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.departure_city + ', ' + f.departure_country)}" target="_blank" class="city-link">${f.departure_city}, ${f.departure_country}</a>`
              }
            </div>
          </div>
          
          <div class="fc-divider">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
          
          <div class="fc-point right">
            <div class="fc-time">${mainArr}</div>
            <div class="fc-time-sub">${subArr}</div>
            <div class="fc-icao copy-click" data-copy="${f.arrival_icao}" title="Click to copy">${f.arrival_icao}</div>
            <div class="fc-city">
              ${f.arrival_city.length + f.arrival_country.length > 22
                ? `<marquee behavior="scroll" direction="left" scrollamount="3" scrolldelay="30"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.arrival_city + ', ' + f.arrival_country)}" target="_blank" class="city-link">${f.arrival_city}, ${f.arrival_country}</a></marquee>`
                : `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.arrival_city + ', ' + f.arrival_country)}" target="_blank" class="city-link">${f.arrival_city}, ${f.arrival_country}</a>`
              }
            </div>
          </div>
        </div>
        
        <div class="fc-footer">
          <div class="fc-duration">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${Math.floor(f.duration_minutes / 60)}h ${f.duration_minutes % 60}m
          </div>
          <div class="fc-days">
            ${daysHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  DOM.grid.innerHTML = html;

  document.querySelectorAll('.copy-click').forEach(el => {
    el.addEventListener('click', (e) => {
      const text = e.target.dataset.copy;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(`Copied ${text}`);
        });
      }
    });
  });

  // Store rendered flights globally for event delegation
  lastRenderedFlights = flights;
}

// ==========================================
// GLOBE / WORLD ROUTE MAP MODAL
// ==========================================
function setupGlobeModal() {
  if (!DOM.btnGlobe || !DOM.globeModal) return;

  DOM.btnGlobe.addEventListener('click', () => {
    DOM.globeModal.classList.remove('hidden');
    initOrUpdateGlobeMap();
  });

  if (DOM.globeModalClose) {
    DOM.globeModalClose.addEventListener('click', () => {
      DOM.globeModal.classList.add('hidden');
    });
  }

  DOM.globeModal.addEventListener('click', (e) => {
    if (e.target === DOM.globeModal) {
      DOM.globeModal.classList.add('hidden');
    }
  });
}

function initOrUpdateGlobeMap() {
  if (!window.L) return;

  if (!globeMapInstance) {
    globeMapInstance = L.map('globe-map', {
      center: [48.0, 16.0],
      zoom: 4,
      minZoom: 2,
      maxZoom: 12
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(globeMapInstance);

    globeLayerGroup = L.layerGroup().addTo(globeMapInstance);
  }

  setTimeout(() => {
    globeMapInstance.invalidateSize();
    renderGlobeRoutes(lastRenderedFlights);
  }, 100);
}

function renderGlobeRoutes(flights) {
  if (!globeLayerGroup || !globeMapInstance) return;
  globeLayerGroup.clearLayers();

  const list = flights && flights.length > 0 ? flights : allFlights;
  if (DOM.globeRoutesCount) {
    DOM.globeRoutesCount.textContent = `Showing ${list.length} routes`;
  }

  const airportsMap = new Map();
  const bounds = L.latLngBounds([]);

  // Draw routes
  list.forEach(f => {
    if (!f.departure_lat || !f.departure_lon || !f.arrival_lat || !f.arrival_lon) return;

    const depLatLng = [f.departure_lat, f.departure_lon];
    const arrLatLng = [f.arrival_lat, f.arrival_lon];

    bounds.extend(depLatLng);
    bounds.extend(arrLatLng);

    airportsMap.set(f.departure_icao, { name: f.departure_city, lat: f.departure_lat, lon: f.departure_lon });
    airportsMap.set(f.arrival_icao, { name: f.arrival_city, lat: f.arrival_lat, lon: f.arrival_lon });

    const color = AIRLINE_COLORS[f.airline] || '#38bdf8';

    const polyline = L.polyline([depLatLng, arrLatLng], {
      color: color,
      weight: 2,
      opacity: 0.65,
      dashArray: null
    }).addTo(globeLayerGroup);

    const tooltipHtml = `
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        <strong style="color: ${color}">${f.flight_number}</strong> (${f.airline})<br>
        <strong>${f.departure_icao}</strong> (${f.departure_city}) ➔ <strong>${f.arrival_icao}</strong> (${f.arrival_city})<br>
        Aircraft: <strong>${f.aircraft_type || 'B738'}</strong> • Duration: ${Math.floor(f.duration_minutes / 60)}h ${f.duration_minutes % 60}m<br>
        <span style="font-size: 11px; opacity: 0.8; color: #38bdf8;">👉 Click to open flight dispatch</span>
      </div>
    `;
    polyline.bindTooltip(tooltipHtml, { sticky: true, className: 'globe-route-tooltip' });

    polyline.on('mouseover', () => {
      polyline.setStyle({ weight: 4, opacity: 1 });
    });
    polyline.on('mouseout', () => {
      polyline.setStyle({ weight: 2, opacity: 0.65 });
    });

    polyline.on('click', () => {
      DOM.globeModal.classList.add('hidden');
      openFlightModal(f);
    });
  });

  // Draw airport node markers
  airportsMap.forEach((apt, icao) => {
    const marker = L.circleMarker([apt.lat, apt.lon], {
      radius: 4,
      fillColor: '#ffffff',
      color: '#0b0f19',
      weight: 1.5,
      opacity: 0.9,
      fillOpacity: 0.8
    }).addTo(globeLayerGroup);

    marker.bindTooltip(`<strong>${icao}</strong> - ${apt.name}`, { direction: 'top' });
  });

  if (bounds.isValid()) {
    globeMapInstance.fitBounds(bounds, { padding: [30, 30] });
  }
}

// --- EVENT DELEGATION: Single click handler on the grid ---
DOM.grid.addEventListener('click', async (e) => {
  if (e.target.closest('.copy-click') || e.target.closest('a')) return;
  
  const card = e.target.closest('.flight-card');
  if (!card) return;
  
  const index = parseInt(card.dataset.flightIndex, 10);
  if (isNaN(index) || !lastRenderedFlights[index]) return;
  
  try {
    await openFlightModal(lastRenderedFlights[index]);
  } catch (err) {
    console.error('Error opening modal:', err);
  }
});

init();

// --- FLIGHT MODAL LOGIC ---
if (!document.getElementById('flight-modal')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="flight-modal" class="modal-overlay hidden">
      <div class="modal-content glass">
        <button id="modal-close" class="modal-close">&times;</button>
        <div id="modal-loading" class="modal-loading">
          <div class="spinner"></div>
          <p>Fetching live aviation data...</p>
        </div>
        <div id="modal-body" class="modal-body hidden">
          <div class="modal-header">
            <div class="m-header-left">
              <div>
                <h2 id="m-callsign-header">--</h2>
                <div id="m-flight-number-sub" class="flight-number-sub">--</div>
              </div>
              <a id="m-google-search-btn" href="#" target="_blank" class="btn-google-search" title="Search flight on Google">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Search on Google</span>
              </a>
              <a id="m-flightradar-search-btn" href="#" target="_blank" class="btn-flightradar" title="Search flight on Flightradar24">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-8.4 8.4"/></svg>
                <span>Search on FR24</span>
              </a>
              <a id="m-edigla-search-btn" href="https://edi-gla.co.uk/" target="_blank" class="btn-edigla" title="Search flight on EDI-GLA">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                <span>Search on EDI-GLA</span>
              </a>
            </div>
            <div class="m-route">
              <span id="m-dep">--</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span id="m-arr">--</span>
            </div>
          </div>
          <div class="modal-grid">
            <!-- Departure Weather -->
            <div class="modal-section weather-section m-dep-wx">
              <h3>Departure Weather <span id="m-dep-icao-lbl"></span></h3>
              <div id="m-dep-metar-graphic" class="metar-graphic"></div>
              <div class="raw-metar" id="m-dep-metar-raw">No METAR available</div>
              <div class="raw-taf" id="m-dep-taf-raw">No TAF available</div>
            </div>
            
            <!-- Arrival Weather -->
            <div class="modal-section weather-section m-arr-wx">
              <h3>Arrival Weather <span id="m-arr-icao-lbl"></span></h3>
              <div id="m-arr-metar-graphic" class="metar-graphic"></div>
              <div class="raw-metar" id="m-arr-metar-raw">No METAR available</div>
              <div class="raw-taf" id="m-arr-taf-raw">No TAF available</div>
            </div>

            <!-- Dispatch & Routing (Spans 2 rows) -->
            <div class="modal-section route-section m-route-box">
              <h3>Dispatch & Routing</h3>
              <div class="route-info-box" style="margin-bottom: 1rem; background: var(--badge-bg); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--panel-border);">
                <span class="route-label" style="font-size: 0.8rem; text-transform: uppercase; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">Route / Waypoints:</span>
                <div id="m-route-string" style="font-family: monospace; font-size: 0.9rem; color: var(--accent-blue); word-break: break-all; white-space: pre-wrap;">DCT</div>
              </div>
              <div id="m-route-map" style="height: 100%; min-height: 250px; flex-grow: 1; border-radius: 8px; margin: 1rem 0; background: var(--input-bg); border: 1px solid var(--input-border); position: relative; overflow: hidden; z-index: 1;"></div>
              <div class="route-buttons" style="display: flex; flex-direction: column; gap: 0.8rem;">
                <a id="m-simbrief-btn" href="#" target="_blank" class="btn-primary simbrief-btn">Generate Route on SimBrief</a>
                <a id="m-skyvector-btn" href="#" target="_blank" class="btn-secondary">View on SkyVector</a>
              </div>
            </div>

            <!-- Departure VATSIM ATC -->
            <div class="modal-section vatsim-section m-dep-atc">
              <h3>Departure ATC</h3>
              <div id="m-dep-vatsim-atc" class="vatsim-atc-list"></div>
            </div>

            <!-- Arrival VATSIM ATC -->
            <div class="modal-section vatsim-section m-arr-atc">
              <h3>Arrival ATC</h3>
              <div id="m-arr-vatsim-atc" class="vatsim-atc-list"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
}

const modalDOM = {
  overlay: document.getElementById('flight-modal'),
  closeBtn: document.getElementById('modal-close'),
  loading: document.getElementById('modal-loading'),
  body: document.getElementById('modal-body'),
  
  callsignHeader: document.getElementById('m-callsign-header'),
  flightNumSub: document.getElementById('m-flight-number-sub'),
  googleSearchBtn: document.getElementById('m-google-search-btn'),
  flightawareSearchBtn: document.getElementById('m-flightaware-search-btn'),
  flightradarSearchBtn: document.getElementById('m-flightradar-search-btn'),
  ediglaSearchBtn: document.getElementById('m-edigla-search-btn'),
  adsbSearchBtn: document.getElementById('m-adsb-search-btn'),
  
  depTimeLocal: document.getElementById('m-dep-time-local'),
  depTimeUtc: document.getElementById('m-dep-time-utc'),
  depTimeYourLocal: document.getElementById('m-dep-time-your-local'),
  depCountdown: document.getElementById('m-dep-countdown'),
  
  arrTimeLocal: document.getElementById('m-arr-time-local'),
  arrTimeUtc: document.getElementById('m-arr-time-utc'),
  arrTimeYourLocal: document.getElementById('m-arr-time-your-local'),
  arrCountdown: document.getElementById('m-arr-countdown'),
  
  dep: document.getElementById('m-dep'),
  arr: document.getElementById('m-arr'),
  
  depIcaoLbl: document.getElementById('m-dep-icao-lbl'),
  arrIcaoLbl: document.getElementById('m-arr-icao-lbl'),
  
  depMetarRaw: document.getElementById('m-dep-metar-raw'),
  arrMetarRaw: document.getElementById('m-arr-metar-raw'),
  
  depMetarGraphic: document.getElementById('m-dep-metar-graphic'),
  arrMetarGraphic: document.getElementById('m-arr-metar-graphic'),
  
  depVatsimAtc: document.getElementById('m-dep-vatsim-atc'),
  arrVatsimAtc: document.getElementById('m-arr-vatsim-atc'),
  
  // Flight stats
  fstatDist: document.getElementById('m-fstat-dist'),
  fstatFl: document.getElementById('m-fstat-fl'),
  fstatDur: document.getElementById('m-fstat-dur'),
  fstatWpts: document.getElementById('m-fstat-wpts'),
  
  depLiveatcBtn: document.getElementById('m-dep-liveatc-btn'),
  arrLiveatcBtn: document.getElementById('m-arr-liveatc-btn'),
  
  // Route source
  routeSource: document.getElementById('m-route-source'),
  routeSourceLink: document.getElementById('m-route-source-link'),
  routeSourceCycle: document.getElementById('m-route-source-cycle'),
  
  simbriefBtn: document.getElementById('m-simbrief-btn'),
  skyvectorBtn: document.getElementById('m-skyvector-btn')
};

if (modalDOM.closeBtn) modalDOM.closeBtn.addEventListener('click', closeFlightModal);
if (modalDOM.overlay) {
  modalDOM.overlay.addEventListener('click', (e) => {
    if (e.target === modalDOM.overlay) closeFlightModal();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalDOM.overlay && !modalDOM.overlay.classList.contains('hidden')) closeFlightModal();
});

function closeFlightModal() {
  modalDOM.overlay.classList.add('hidden');
  if (window.routeMapInstance) {
    try {
      window.routeMapInstance.remove();
    } catch (e) {
      console.error(e);
    }
    window.routeMapInstance = null;
  }
}

async function fetchRouteData(from, to) {
  try {
    // 1. Search plans directly from browser to use user's clean IP
    const searchUrl = `https://api.flightplandatabase.com/search/plans?fromICAO=${from}&toICAO=${to}&limit=10`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!searchRes.ok) {
      throw new Error(`FPD search failed: ${searchRes.status}`);
    }

    const plans = await searchRes.json();
    if (!Array.isArray(plans) || plans.length === 0) {
      return { route: 'DCT', distance: null, waypoints: [], source: null };
    }

    // 2. Sort by popularity descending
    plans.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    const bestPlan = plans[0];

    // 3. Fetch plan details
    const planRes = await fetch(`https://api.flightplandatabase.com/plan/${bestPlan.id}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!planRes.ok) {
      throw new Error(`FPD plan fetch failed: ${planRes.status}`);
    }

    const planData = await planRes.json();
    const nodes = planData.route?.nodes || [];

    const waypoints = nodes.map(node => ({
      ident: node.ident,
      type: node.type,
      lat: node.lat,
      lon: node.lon,
      alt: node.alt,
      via: node.via?.ident ?? null,
      viaType: node.via?.type ?? null,
    }));

    // Build route string from nodes, excluding DEP/ARR airports
    const innerNodes = nodes.filter(n => n.type !== 'APT');
    let routeString = planData.routeString || '';
    if (!routeString && innerNodes.length > 0) {
      const parts = [];
      for (const node of innerNodes) {
        if (node.via) parts.push(node.via.ident);
        parts.push(node.ident);
      }
      routeString = parts.filter((v, i, a) => i === 0 || v !== a[i - 1]).join(' ');
    }

    // Clean up routeString to remove departure and arrival if they are at the ends
    const words = routeString.trim().split(/\s+/);
    if (words[0] === from) words.shift();
    if (words[words.length - 1] === to) words.pop();
    const routeClean = words.join(' ');

    // Extract cruise altitude
    const notes = planData.notes || '';
    const altMatch = notes.match(/Cruise Altitude:\s*(\d+)ft/);
    const cruiseAlt = altMatch ? parseInt(altMatch[1]) : (bestPlan.maxAltitude ?? null);

    // Build airways summary
    const airways = [...new Set(
      nodes
        .filter(n => n.via?.type?.startsWith('AWY'))
        .map(n => n.via.ident)
    )].slice(0, 6);

    return {
      route: routeClean || 'DCT',
      distance: Math.round(planData.distance ?? bestPlan.distance ?? 0),
      waypoints,
      cruiseAltitude: cruiseAlt,
      waypointCount: innerNodes.length,
      airways,
      source: {
        name: 'Flight Plan Database',
        url: `https://flightplandatabase.com/plan/${bestPlan.id}`,
        popularity: bestPlan.popularity ?? 0,
        cycle: planData.cycle?.ident ?? null,
        username: planData.user?.username ?? null,
      }
    };
  } catch (err) {
    console.warn('Direct browser fetch failed (trying server proxy):', err);
    try {
      const res = await fetch(`/api/flight-route?from=${from}&to=${to}`);
      if (res.ok) return await res.json();
    } catch (proxyErr) {
      console.error('Server proxy also failed:', proxyErr);
    }
    return { route: 'DCT', distance: null, waypoints: [], source: null };
  }
}

function getNextOccurrenceUtc(dayOfWeek, timeUtcStr) {
  const now = new Date();
  const [hours, minutes] = timeUtcStr.split(':').map(Number);
  let date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0));
  
  const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
  
  while (date.getUTCDay() !== targetDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  
  if (date.getTime() < now.getTime()) {
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return date;
}

function formatCountdown(ms) {
  const totalMins = Math.floor(ms / 60000);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

async function openFlightModal(flight) {
  // Show modal, reset state
  modalDOM.overlay.classList.remove('hidden');
  modalDOM.loading.classList.remove('hidden');
  modalDOM.body.classList.add('hidden');
  
  if (window.routeMapInstance) {
    try {
      window.routeMapInstance.remove();
    } catch (e) {
      console.error(e);
    }
    window.routeMapInstance = null;
  }
  
  // Reset stats
  if (modalDOM.fstatDist) modalDOM.fstatDist.textContent = '—';
  if (modalDOM.fstatFl) modalDOM.fstatFl.textContent = '—';
  if (modalDOM.fstatDur) modalDOM.fstatDur.textContent = '—';
  if (modalDOM.fstatWpts) modalDOM.fstatWpts.textContent = '—';
  if (modalDOM.airwaysBox) modalDOM.airwaysBox.classList.add('hidden');
  if (modalDOM.routeSource) modalDOM.routeSource.classList.add('hidden');
  
  // Populate Header
  const fn = (flight.flight_number || '').replace(/\s+/g, '');
  const fallbackCallsign = 'RYR' + fn.replace(/^[A-Za-z]+/, '');
  const primaryCallsign = flight.callsign || fallbackCallsign;
  const fullFltNum = flight.airline ? `${flight.airline} ${fn}` : fn;
  
  if (primaryCallsign !== fallbackCallsign && flight.callsign) {
    modalDOM.callsignHeader.innerHTML = `${primaryCallsign} <span style="display: block; font-size: 0.5em; color: var(--text-muted); font-weight: 100; margin-top: 0.2rem;">(Fallback: ${fallbackCallsign})</span>`;
  } else {
    modalDOM.callsignHeader.textContent = primaryCallsign;
  }
  
  modalDOM.flightNumSub.textContent = `Let: ${fullFltNum}`;
  modalDOM.googleSearchBtn.href = `https://www.google.com/search?q=${encodeURIComponent(fullFltNum)}`;
  modalDOM.flightawareSearchBtn.href = `https://flightaware.com/live/flight/${fallbackCallsign}`;
  modalDOM.flightradarSearchBtn.href = `https://www.flightradar24.com/data/flights/${fn.toLowerCase()}`;
  modalDOM.ediglaSearchBtn.href = `https://edi-gla.co.uk/flightplan/search?Flightplan%5Bcallsign%5D=&Flightplan%5Baircraft_icao%5D=&Flightplan%5Bdep%5D=${flight.departure_icao}&Flightplan%5Bdest%5D=${flight.arrival_icao}&Flightplan%5Bsearch_flight_time%5D=&Flightplan%5Bsearch_contributor_username%5D=&Flightplan%5Bremarks%5D=&Flightplan%5Bsearch_date_from%5D=&Flightplan%5Bsearch_date_to%5D=&Flightplan%5Bairac_cycle_validated%5D=&Flightplan%5Bsearch_sort_field%5D=fpl_id&Flightplan%5Bsearch_sort_order%5D=3`;
  
  modalDOM.adsbSearchBtn.href = `https://globe.adsb.fi/?lat=50.0&lon=15.0&zoom=4.5&filterCallSign=${primaryCallsign}`;
  
  modalDOM.dep.textContent = flight.departure_icao;
  modalDOM.arr.textContent = flight.arrival_icao;
  
  modalDOM.depLiveatcBtn.href = `https://www.liveatc.net/search/?icao=${flight.departure_icao.toLowerCase()}`;
  modalDOM.arrLiveatcBtn.href = `https://www.liveatc.net/search/?icao=${flight.arrival_icao.toLowerCase()}`;
  
  modalDOM.depIcaoLbl.textContent = flight.departure_icao;
  modalDOM.arrIcaoLbl.textContent = flight.arrival_icao;

  // Populate Times
  const englishDays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const depLocalDay = flight.day_of_operation;
  const depUtcDay = getUtcDay(flight.day_of_operation, flight.departure_time, flight.departure_time_utc);
  
  let arrLocalDay = depLocalDay;
  if (parseTime(flight.arrival_time) < parseTime(flight.departure_time)) {
    arrLocalDay = (arrLocalDay % 7) + 1;
  }
  
  let arrUtcDay = depUtcDay;
  if (parseTime(flight.arrival_time_utc) < parseTime(flight.departure_time_utc)) {
    arrUtcDay = (arrUtcDay % 7) + 1;
  }
  
  modalDOM.depTimeLocal.innerHTML = `${flight.departure_time} <span class="time-day-badge">${englishDays[depLocalDay]}</span>`;
  modalDOM.depTimeUtc.innerHTML = `${flight.departure_time_utc} <span class="time-day-badge utc-badge">${englishDays[depUtcDay]}</span>`;
  modalDOM.arrTimeLocal.innerHTML = `${flight.arrival_time} <span class="time-day-badge">${englishDays[arrLocalDay]}</span>`;
  modalDOM.arrTimeUtc.innerHTML = `${flight.arrival_time_utc} <span class="time-day-badge utc-badge">${englishDays[arrUtcDay]}</span>`;

  if (modalDOM.depTimeYourLocal) {
    const nextDep = getNextOccurrenceUtc(depUtcDay, flight.departure_time_utc);
    modalDOM.depTimeYourLocal.innerHTML = `${nextDep.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} <span class="time-day-badge utc-badge">${nextDep.toLocaleDateString('en-US', {weekday: 'long'})}</span>`;
    modalDOM.depCountdown.textContent = formatCountdown(nextDep.getTime() - Date.now());
    
    const nextArr = getNextOccurrenceUtc(arrUtcDay, flight.arrival_time_utc);
    if (nextArr.getTime() < nextDep.getTime()) {
      nextArr.setUTCDate(nextArr.getUTCDate() + 7);
    }
    modalDOM.arrTimeYourLocal.innerHTML = `${nextArr.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} <span class="time-day-badge utc-badge">${nextArr.toLocaleDateString('en-US', {weekday: 'long'})}</span>`;
    modalDOM.arrCountdown.textContent = formatCountdown(nextArr.getTime() - Date.now());
  }

  // Fetch Data concurrently
  try {
    const [depMetar, arrMetar, vatsimData, routeData] = await Promise.allSettled([
      fetchMetar(flight.departure_icao),
      fetchMetar(flight.arrival_icao),
      fetchVatsimData(),
      fetchRouteData(flight.departure_icao, flight.arrival_icao)
    ]);
    
    // Render Weather
    renderWeather(depMetar.value, modalDOM.depMetarRaw, modalDOM.depMetarGraphic);
    renderWeather(arrMetar.value, modalDOM.arrMetarRaw, modalDOM.arrMetarGraphic);
    
    // Render VATSIM
    renderVatsimATC(vatsimData.value, flight.departure_icao, 'dep');
    renderVatsimATC(vatsimData.value, flight.arrival_icao, 'arr');
    
    // Handle Route
    const routeObj = routeData.status === 'fulfilled' ? routeData.value : { route: 'DCT', distance: null, waypoints: [] };
    const routeString = routeObj.route || 'DCT';
    
    const routeStrEl = document.getElementById('m-route-string');
    if (routeStrEl) routeStrEl.textContent = routeString;

    // --- Flight Stats ---
    if (modalDOM.fstatDist && routeObj.distance) {
      modalDOM.fstatDist.textContent = routeObj.distance;
    } else if (modalDOM.fstatDist && flight.duration_minutes) {
      // Estimate from duration: ~450kt cruise → NM ≈ duration_min * 7.5
      modalDOM.fstatDist.textContent = Math.round(flight.duration_minutes * 7.5);
    }

    if (modalDOM.fstatFl && routeObj.cruiseAltitude) {
      modalDOM.fstatFl.textContent = `FL${Math.round(routeObj.cruiseAltitude / 100)}`;
    }

    if (modalDOM.fstatDur && flight.duration_minutes) {
      const h = Math.floor(flight.duration_minutes / 60);
      const m = flight.duration_minutes % 60;
      modalDOM.fstatDur.textContent = `${h}h ${m.toString().padStart(2,'0')}m`;
    }

    if (modalDOM.fstatWpts && routeObj.waypointCount) {
      modalDOM.fstatWpts.textContent = routeObj.waypointCount;
    }



    // --- Route Source ---
    if (modalDOM.routeSource && routeObj.source) {
      modalDOM.routeSourceLink.textContent = routeObj.source.name;
      modalDOM.routeSourceLink.href = routeObj.source.url || '#';
      modalDOM.routeSourceCycle.textContent = routeObj.source.cycle ? `• AIRAC ${routeObj.source.cycle}` : '';
      modalDOM.routeSource.classList.remove('hidden');
    }

    // Populate Route Links
    const callsignVal = flight.callsign || `RYR${fn}`;
    // Route is displayed informatively only – not pushed into SimBrief URL so the pilot can edit it freely
    const airlineIcao = flight.airline_icao || 'RYR';
    const acType = flight.aircraft_type || 'B738';
    const cleanFltNum = fn.replace(/^[A-Za-z]+/, '');
    let simbriefUrl = `https://dispatch.simbrief.com/options/custom?orig=${flight.departure_icao}&dest=${flight.arrival_icao}&airline=${encodeURIComponent(airlineIcao)}&fltnum=${encodeURIComponent(cleanFltNum)}&callsign=${encodeURIComponent(callsignVal)}&type=${encodeURIComponent(acType)}`;
    if (flight.departure_time_utc && flight.departure_time_utc !== '--:--') {
      const [deph, depm] = flight.departure_time_utc.split(':');
      simbriefUrl += `&deph=${deph}&depm=${depm}`;
    }
    modalDOM.simbriefBtn.href = simbriefUrl;

    let fpl = `${flight.departure_icao}%20${flight.arrival_icao}`;
    if (routeString && routeString !== 'DCT') {
      fpl = `${flight.departure_icao}%20${encodeURIComponent(routeString)}%20${flight.arrival_icao}`;
    }
    modalDOM.skyvectorBtn.href = `https://skyvector.com/?fpl=${fpl}`;

    // Draw Leaflet Map
    const mapEl = document.getElementById('m-route-map');
    if (mapEl && typeof L !== 'undefined') {
      const depLat = flight.departure_lat;
      const depLon = flight.departure_lon;
      const arrLat = flight.arrival_lat;
      const arrLon = flight.arrival_lon;

      if (depLat && depLon && arrLat && arrLon) {
        const map = L.map('m-route-map', {
          zoomControl: false,
          attributionControl: false
        });
        window.routeMapInstance = map;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const tileUrl = isDark 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

        const depMarker = L.marker([depLat, depLon]).addTo(map);
        depMarker.bindTooltip(flight.departure_icao, { permanent: true, direction: 'top' });

        const arrMarker = L.marker([arrLat, arrLon]).addTo(map);
        arrMarker.bindTooltip(flight.arrival_icao, { permanent: true, direction: 'top' });

        const latlngs = [[depLat, depLon]];
        const wps = routeObj.waypoints || [];
        wps.forEach(wp => {
          if (wp.lat && wp.lon && wp.type !== 'APT') {
            latlngs.push([wp.lat, wp.lon]);
            // Only show named waypoints, not all
            if (wp.type === 'VOR' || wp.type === 'NDB') {
              L.circleMarker([wp.lat, wp.lon], {
                radius: 5,
                color: '#FF8C00',
                fillColor: '#FF8C00',
                fillOpacity: 1,
                weight: 1
              }).addTo(map).bindTooltip(`${wp.ident} ${wp.via ? '(' + wp.via + ')' : ''}`.trim());
            } else {
              L.circleMarker([wp.lat, wp.lon], {
                radius: 3,
                color: 'rgba(var(--color-accent-rgb), 0.7)',
                fillColor: '#aaa',
                fillOpacity: 0.7,
                weight: 1
              }).addTo(map);
            }
          }
        });
        latlngs.push([arrLat, arrLon]);

        const polyline = L.polyline(latlngs, {
          color: '#00BDB1',
          weight: 3,
          opacity: 0.85
        }).addTo(map);

        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }, 250);
      }
    }
    
  } catch (err) {
    console.error('Error fetching live data:', err);
  } finally {
    modalDOM.loading.classList.add('hidden');
    modalDOM.body.classList.remove('hidden');
  }
}

// --- API FETCHERS ---

async function fetchMetar(icao) {
  const res = await fetch(`/api/metar?ids=${icao}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

async function fetchTaf(icao) {
  const res = await fetch(`/api/taf?ids=${icao}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

async function fetchVatsimData() {
  const res = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
  if (!res.ok) return null;
  return res.json();
}

// --- RENDERERS ---

function renderWeather(metar, rawEl, graphicEl) {
  if (!metar) {
    rawEl.textContent = 'No METAR available for this station.';
    graphicEl.innerHTML = '';
    return;
  }
  
  rawEl.textContent = metar.rawOb || 'No raw data.';
  
  const cat = (metar.fltCat || 'UNK').toLowerCase();
  const wdir = metar.wdir !== undefined ? metar.wdir : 0;
  const wspd = metar.wspd !== undefined ? metar.wspd : 0;
  
  graphicEl.innerHTML = `
    <div class="mg-category ${cat}" title="Flight Category: ${cat.toUpperCase()}">${cat.toUpperCase()}</div>
    <div class="mg-wind" title="Wind ${wdir}° at ${wspd} kts">
      <svg class="mg-wind-arrow" style="transform: rotate(${wdir}deg);" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/></svg>
      <span>${wspd}kt</span>
    </div>
    <div class="mg-temp" title="Temp / Dewpoint">
      ${metar.temp !== undefined ? metar.temp : '--'}°C
      <span>Dew ${metar.dewp !== undefined ? metar.dewp : '--'}°C</span>
    </div>
    <div class="mg-vis" title="Visibility">
      ${metar.visib !== undefined ? metar.visib : '--'}
      <span>Vis (SM)</span>
    </div>
  `;
}

function renderTaf(taf, rawEl) {
  if (!taf || !taf.rawTAF) {
    rawEl.textContent = 'No TAF available for this station.';
    return;
  }
  // format TAF to be readable (replace ' FM' or ' BECMG' with newlines)
  let t = taf.rawTAF;
  t = t.replace(/ (FM|BECMG|TEMPO|PROB)/g, '\n$1');
  rawEl.textContent = t;
}

function renderVatsimATC(vatsim, icao, type) {
  const container = type === 'dep' ? modalDOM.depVatsimAtc : modalDOM.arrVatsimAtc;
  if (!container) return;
  
  container.innerHTML = '';
  if (!vatsim || !vatsim.controllers) {
    container.innerHTML = '<div class="no-atc">Failed to fetch VATSIM data.</div>';
    return;
  }
  
  const prefixes = [icao, icao.substring(0, 2)];
  
  const atc = vatsim.controllers.filter(c => {
    if (c.facility === 0) return false; // observer
    
    // Check if callsign starts with ICAO or regional prefix
    return prefixes.some(p => c.callsign.startsWith(p));
  });
  
  if (atc.length === 0) {
    container.innerHTML = '<div class="no-atc">No local ATC online.</div>';
    return;
  }
  
  atc.sort((a, b) => a.callsign.localeCompare(b.callsign));
  
  atc.forEach(c => {
    container.innerHTML += `
      <div class="vatsim-controller">
        <span class="cs">${c.callsign}</span>
        <span class="freq">${c.frequency}</span>
      </div>
    `;
  });
}

// --- SMART BIDIRECTIONAL STICKY SIDEBAR LOGIC ---
let lastScrollY = window.scrollY;
let stickyTop = 32; // 2rem (32px) base offset

function updateStickySidebar() {
  const sidebar = document.querySelector('.filters-panel');
  if (!sidebar) return;
  
  const viewportHeight = window.innerHeight;
  const sidebarHeight = sidebar.offsetHeight;
  const currentScrollY = window.scrollY;
  const scrollDelta = currentScrollY - lastScrollY;
  
  if (sidebarHeight + 64 > viewportHeight) {
    // Sidebar is taller than viewport
    const minTop = viewportHeight - sidebarHeight - 32; // Bottom margin 32px
    const maxTop = 32; // Top margin 32px
    
    stickyTop -= scrollDelta;
    
    // Clamp
    if (stickyTop > maxTop) stickyTop = maxTop;
    if (stickyTop < minTop) stickyTop = minTop;
    
    sidebar.style.top = `${stickyTop}px`;
  } else {
    // Sidebar fits completely
    sidebar.style.top = '2rem';
    stickyTop = 32;
  }
  
  lastScrollY = currentScrollY;
}

window.addEventListener('scroll', updateStickySidebar, { passive: true });
window.addEventListener('resize', updateStickySidebar);
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateStickySidebar, 100);
});

const fp = document.querySelector('.filters-panel');
if (fp) {
  const resizeObserver = new ResizeObserver(() => {
    updateStickySidebar();
  });
  resizeObserver.observe(fp);
}
