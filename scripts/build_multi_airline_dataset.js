const fs = require('fs');
const path = require('path');

const airportsPath = path.join(__dirname, 'airports.json');
const routesPath = path.join(__dirname, 'routes.json');
const ryanairPath = path.join(__dirname, '..', 'ryanair_flights_lzib.json');
const outputPath = path.join(__dirname, '..', 'flights.json');

const airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

function haversineDistanceNm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function calculateDuration(distNm) {
  return Math.round((distNm / 440) * 60 + 25);
}

function timeToMins(tStr) {
  if (!tStr) return 480;
  const [h, m] = tStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(m) {
  m = (m % 1440 + 1440) % 1440;
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const min = (m % 60).toString().padStart(2, '0');
  return h + ':' + min;
}

function getRealisticTurnaround(aircraftType, distNm) {
  const widebodies = ['A388', 'B744', 'B748', 'A351', 'A359', 'B77W', 'B772', 'B789', 'B788', 'B78X', 'A332', 'A333', 'A343', 'B763'];
  if (widebodies.includes(aircraftType) || distNm > 2000) {
    return 135; // 2h 15m for widebodies / long-hauls
  }
  if (distNm > 1000) {
    return 60; // 1 hour for medium-distance flights
  }
  return 45; // 45 mins standard for narrowbodies
}

// 1. Process Ryanair flights with strict deduplication by callsign + dep + arr + day
let rawRyanair = [];
if (fs.existsSync(ryanairPath)) {
  try {
    rawRyanair = JSON.parse(fs.readFileSync(ryanairPath, 'utf8'));
  } catch (e) {
    console.warn('Could not parse ryanair_flights_lzib.json:', e);
  }
}

const ryanairMap = new Map();

for (const f of rawRyanair) {
  const depIcao = f.departure_icao || f.dep_icao || 'LZIB';
  const arrIcao = f.arrival_icao || f.arr_icao || 'EGSS';
  const dayOp = f.day_of_operation || 1;
  const callsign = f.callsign || ('RYR' + (f.flight_number ? f.flight_number.replace(/\D/g, '') : '2315'));
  
  const key = `${callsign}_${depIcao}_${arrIcao}_${dayOp}`;
  if (ryanairMap.has(key)) continue;

  const depApt = airports[depIcao] || { lat: 48.1702, lon: 17.2127, tz: 1, city: 'Bratislava', country: 'Slovakia', iata: 'BTS' };
  const arrApt = airports[arrIcao] || { lat: 51.8860, lon: 0.2389, tz: 0, city: 'London', country: 'United Kingdom', iata: 'STN' };

  const days = Array.isArray(f.days_of_week) && f.days_of_week.length > 0 
    ? f.days_of_week 
    : (Array.isArray(f.days_of_operation) && f.days_of_operation.length > 0 ? f.days_of_operation : [dayOp]);

  const depLat = f.departure_lat ?? f.dep_lat ?? depApt.lat ?? 48.17;
  const depLon = f.departure_lon ?? f.dep_lon ?? depApt.lon ?? 17.21;
  const arrLat = f.arrival_lat ?? f.arr_lat ?? arrApt.lat ?? 51.88;
  const arrLon = f.arrival_lon ?? f.arr_lon ?? arrApt.lon ?? 0.23;

  const distNm = f.distance_nm || haversineDistanceNm(depLat, depLon, arrLat, arrLon);
  const durMins = f.duration_minutes || calculateDuration(distNm);

  const depTime = f.departure_time || f.dep_time_local || '08:00';
  const arrTime = f.arrival_time || f.arr_time_local || minsToTime(timeToMins(depTime) + durMins);
  const depTz = depApt.tz !== undefined ? depApt.tz : 1;
  const arrTz = arrApt.tz !== undefined ? arrApt.tz : 1;

  const depUtc = f.departure_time_utc || minsToTime(timeToMins(depTime) - depTz * 60);
  const arrUtc = f.arrival_time_utc || minsToTime(timeToMins(arrTime) - arrTz * 60);

  ryanairMap.set(key, {
    airline: 'Ryanair',
    airline_icao: 'RYR',
    airline_iata: 'FR',
    aircraft_type: f.aircraft_type || 'B738',
    flight_number: f.flight_number || ('FR ' + (f.callsign ? f.callsign.replace('RYR', '') : '2315')),
    callsign: callsign,
    departure_icao: depIcao,
    dep_icao: depIcao,
    departure_iata: f.departure_iata || f.dep_iata || depApt.iata || '',
    dep_iata: f.departure_iata || f.dep_iata || depApt.iata || '',
    departure_city: f.departure_city || f.dep_city || depApt.city || 'Bratislava',
    dep_city: f.departure_city || f.dep_city || depApt.city || 'Bratislava',
    departure_country: f.departure_country || f.dep_country || depApt.country || 'Slovakia',
    dep_country: f.departure_country || f.dep_country || depApt.country || 'Slovakia',
    arrival_icao: arrIcao,
    arr_icao: arrIcao,
    arrival_iata: f.arrival_iata || f.arr_iata || arrApt.iata || '',
    arr_iata: f.arrival_iata || f.arr_iata || arrApt.iata || '',
    arrival_city: f.arrival_city || f.arr_city || arrApt.city || '',
    arr_city: f.arrival_city || f.arr_city || arrApt.city || '',
    arrival_country: f.arrival_country || f.arr_country || arrApt.country || '',
    arr_country: f.arrival_country || f.arr_country || arrApt.country || '',
    departure_time: depTime,
    dep_time_local: depTime,
    dep_time_utc: depUtc,
    departure_time_utc: depUtc,
    arrival_time: arrTime,
    arr_time_local: arrTime,
    arr_time_utc: arrUtc,
    arrival_time_utc: arrUtc,
    dep_tz: depTz,
    arr_tz: arrTz,
    duration_minutes: durMins,
    day_of_operation: dayOp,
    homebase: depIcao === 'LZIB' ? 'LZIB' : (f.homebase || 'EGSS'),
    departure_lat: depLat,
    dep_lat: depLat,
    departure_lon: depLon,
    dep_lon: depLon,
    arrival_lat: arrLat,
    arr_lat: arrLat,
    arrival_lon: arrLon,
    arr_lon: arrLon,
    distance_nm: distNm,
    days_of_operation: days,
    days_of_week: days
  });
}

const ryanairEnriched = Array.from(ryanairMap.values());

// 2. Process Routes (One flight per scheduled day of operation)
const newFlights = [];
const routesSeen = new Set();

for (const cfg of routes) {
  const depApt = airports[cfg.fromIcao];
  const arrApt = airports[cfg.toIcao];
  if (!depApt || !arrApt) {
    console.warn('Unknown airport in route:', cfg.fromIcao, cfg.toIcao);
    continue;
  }
  const distNm = haversineDistanceNm(depApt.lat, depApt.lon, arrApt.lat, arrApt.lon);
  const duration = calculateDuration(distNm);

  const depOutMins = timeToMins(cfg.depTimeOutLocal);
  const depOutUtcMins = depOutMins - (depApt.tz * 60);
  const arrOutUtcMins = depOutUtcMins + duration;
  const arrOutMins = arrOutUtcMins + (arrApt.tz * 60);

  const turnaround = cfg.turnaroundMins || getRealisticTurnaround(cfg.aircraft_type, distNm);
  const depInMins = cfg.depTimeInLocal ? timeToMins(cfg.depTimeInLocal) : (arrOutMins + turnaround);
  const depInUtcMins = depInMins - (arrApt.tz * 60);
  const arrInUtcMins = depInUtcMins + duration;
  const arrInMins = arrInUtcMins + (depApt.tz * 60);

  for (const day of cfg.daysOfWeek) {
    const dayOp = day === 0 ? 7 : day;
    
    // Outbound
    const outCallsign = cfg.callsignOut || (cfg.airline_icao + cfg.flightNumOut);
    const outKey = outCallsign + '_' + cfg.fromIcao + '_' + cfg.toIcao + '_' + dayOp;
    if (!routesSeen.has(outKey)) {
      routesSeen.add(outKey);
      newFlights.push({
        airline: cfg.airline,
        airline_icao: cfg.airline_icao,
        airline_iata: cfg.airline_iata,
        aircraft_type: cfg.aircraft_type,
        flight_number: cfg.airline_iata + ' ' + cfg.flightNumOut,
        callsign: outCallsign,
        departure_icao: cfg.fromIcao,
        dep_icao: cfg.fromIcao,
        departure_iata: depApt.iata || '',
        dep_iata: depApt.iata || '',
        departure_city: depApt.city,
        dep_city: depApt.city,
        departure_country: depApt.country,
        dep_country: depApt.country,
        arrival_icao: cfg.toIcao,
        arr_icao: cfg.toIcao,
        arrival_iata: arrApt.iata || '',
        arr_iata: arrApt.iata || '',
        arrival_city: arrApt.city,
        arr_city: arrApt.city,
        arrival_country: arrApt.country,
        arr_country: arrApt.country,
        departure_time: minsToTime(depOutMins),
        dep_time_local: minsToTime(depOutMins),
        dep_time_utc: minsToTime(depOutUtcMins),
        departure_time_utc: minsToTime(depOutUtcMins),
        arrival_time: minsToTime(arrOutMins),
        arr_time_local: minsToTime(arrOutMins),
        arr_time_utc: minsToTime(arrOutUtcMins),
        arrival_time_utc: minsToTime(arrOutUtcMins),
        dep_tz: depApt.tz,
        arr_tz: arrApt.tz,
        duration_minutes: duration,
        day_of_operation: dayOp,
        homebase: cfg.fromIcao,
        departure_lat: depApt.lat,
        dep_lat: depApt.lat,
        departure_lon: depApt.lon,
        dep_lon: depApt.lon,
        arrival_lat: arrApt.lat,
        arr_lat: arrApt.lat,
        arrival_lon: arrApt.lon,
        arr_lon: arrApt.lon,
        distance_nm: distNm,
        days_of_operation: cfg.daysOfWeek,
        days_of_week: cfg.daysOfWeek
      });
    }

    // Inbound
    const inCallsign = cfg.callsignIn || (cfg.airline_icao + cfg.flightNumIn);
    const inKey = inCallsign + '_' + cfg.toIcao + '_' + cfg.fromIcao + '_' + dayOp;
    if (!routesSeen.has(inKey)) {
      routesSeen.add(inKey);
      newFlights.push({
        airline: cfg.airline,
        airline_icao: cfg.airline_icao,
        airline_iata: cfg.airline_iata,
        aircraft_type: cfg.aircraft_type,
        flight_number: cfg.airline_iata + ' ' + cfg.flightNumIn,
        callsign: inCallsign,
        departure_icao: cfg.toIcao,
        dep_icao: cfg.toIcao,
        departure_iata: arrApt.iata || '',
        dep_iata: arrApt.iata || '',
        departure_city: arrApt.city,
        dep_city: arrApt.city,
        departure_country: arrApt.country,
        dep_country: arrApt.country,
        arrival_icao: cfg.fromIcao,
        arr_icao: cfg.fromIcao,
        arrival_iata: depApt.iata || '',
        arr_iata: depApt.iata || '',
        arrival_city: depApt.city,
        arr_city: depApt.city,
        arrival_country: depApt.country,
        arr_country: depApt.country,
        departure_time: minsToTime(depInMins),
        dep_time_local: minsToTime(depInMins),
        dep_time_utc: minsToTime(depInUtcMins),
        departure_time_utc: minsToTime(depInUtcMins),
        arrival_time: minsToTime(arrInMins),
        arr_time_local: minsToTime(arrInMins),
        arr_time_utc: minsToTime(arrInUtcMins),
        arrival_time_utc: minsToTime(arrInUtcMins),
        dep_tz: arrApt.tz,
        arr_tz: depApt.tz,
        duration_minutes: duration,
        day_of_operation: dayOp,
        homebase: cfg.fromIcao,
        departure_lat: arrApt.lat,
        dep_lat: arrApt.lat,
        departure_lon: arrApt.lon,
        dep_lon: arrApt.lon,
        arrival_lat: depApt.lat,
        arr_lat: depApt.lat,
        arrival_lon: depApt.lon,
        arr_lon: depApt.lon,
        distance_nm: distNm,
        days_of_operation: cfg.daysOfWeek,
        days_of_week: cfg.daysOfWeek
      });
    }
  }
}

// Combine all flights
const allFlights = [...ryanairEnriched, ...newFlights];

fs.writeFileSync(outputPath, JSON.stringify(allFlights, null, 2), 'utf8');
console.log(`Successfully generated ${allFlights.length} unique daily flight schedules in flights.json`);
