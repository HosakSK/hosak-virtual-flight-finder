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

// 1. Process Ryanair flights
let rawRyanair = [];
if (fs.existsSync(ryanairPath)) {
  try {
    rawRyanair = JSON.parse(fs.readFileSync(ryanairPath, 'utf8'));
  } catch (e) {
    console.warn('Could not parse ryanair_flights_lzib.json:', e);
  }
}

const ryanairEnriched = rawRyanair.filter(f => f.airline === 'Ryanair' || !f.airline).map(f => {
  const depIcao = f.departure_icao || f.dep_icao || 'LZIB';
  const arrIcao = f.arrival_icao || f.arr_icao || 'EGSS';
  const depApt = airports[depIcao] || {};
  const arrApt = airports[arrIcao] || {};

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

  const days = f.days_of_operation || f.days_of_week || [1, 2, 3, 4, 5, 6, 7];
  let dayOp = f.day_of_operation;
  if (dayOp === 0) dayOp = 7;
  if (!dayOp) dayOp = days[0] || 1;

  return {
    airline: 'Ryanair',
    airline_icao: 'RYR',
    airline_iata: 'FR',
    aircraft_type: f.aircraft_type || 'B738',
    flight_number: f.flight_number || ('FR ' + (f.callsign ? f.callsign.replace('RYR', '') : '2315')),
    callsign: f.callsign || ('RYR' + (f.flight_number ? f.flight_number.replace(/\D/g, '') : '2315')),
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
    departure_time_utc: depUtc,
    arrival_time: arrTime,
    arr_time_local: arrTime,
    arrival_time_utc: arrUtc,
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
  };
});

// 2. Process Routes (One flight instance per scheduled day of operation)
const newFlights = [];
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

  const turnaround = cfg.turnaroundMins || 50;
  const depInMins = arrOutMins + turnaround;
  const depInUtcMins = depInMins - (arrApt.tz * 60);
  const arrInUtcMins = depInUtcMins + duration;
  const arrInMins = arrInUtcMins + (depApt.tz * 60);

  for (const day of cfg.daysOfWeek) {
    const dayOp = day === 0 ? 7 : day;
    
    // Outbound flight instance for this day
    newFlights.push({
      airline: cfg.airline,
      airline_icao: cfg.airline_icao,
      airline_iata: cfg.airline_iata,
      aircraft_type: cfg.aircraft_type,
      flight_number: cfg.airline_iata + ' ' + cfg.flightNumOut,
      callsign: cfg.callsignOut || (cfg.airline_icao + cfg.flightNumOut),
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
      departure_time_utc: minsToTime(depOutUtcMins),
      arrival_time: minsToTime(arrOutMins),
      arr_time_local: minsToTime(arrOutMins),
      arrival_time_utc: minsToTime(arrOutUtcMins),
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

    // Inbound flight instance for this day
    newFlights.push({
      airline: cfg.airline,
      airline_icao: cfg.airline_icao,
      airline_iata: cfg.airline_iata,
      aircraft_type: cfg.aircraft_type,
      flight_number: cfg.airline_iata + ' ' + cfg.flightNumIn,
      callsign: cfg.callsignIn || (cfg.airline_icao + cfg.flightNumIn),
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
      departure_time_utc: minsToTime(depInUtcMins),
      arrival_time: minsToTime(arrInMins),
      arr_time_local: minsToTime(arrInMins),
      arrival_time_utc: minsToTime(arrInUtcMins),
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

// Combine all flights
const allFlights = [...ryanairEnriched, ...newFlights];

// Sort primarily by day_of_operation (1 to 7), then by departure time
allFlights.sort((a, b) => {
  const dayA = a.day_of_operation || 1;
  const dayB = b.day_of_operation || 1;
  if (dayA !== dayB) return dayA - dayB;
  return (a.departure_time || '00:00').localeCompare(b.departure_time || '00:00');
});

fs.writeFileSync(outputPath, JSON.stringify(allFlights, null, 2), 'utf8');
console.log(`Successfully generated ${allFlights.length} flight schedules in flights.json`);
