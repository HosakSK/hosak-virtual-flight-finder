const fs = require('fs');
const path = require('path');

const airportsPath = path.join(__dirname, 'airports.json');
const routesPath = path.join(__dirname, 'routes.json');
const ryanairPath = path.join(__dirname, '..', 'ryanair_flights_lzib.json');
const flightsOutPath = path.join(__dirname, '..', 'flights.json');

const airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function calculateDuration(distKm) {
  return Math.round((distKm / 840) * 60 + 30);
}

function timeToMins(tStr) {
  const [h, m] = tStr.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(m) {
  m = (m % 1440 + 1440) % 1440;
  const h = Math.floor(m / 60).toString().padStart(2, '0');
  const min = (m % 60).toString().padStart(2, '0');
  return h + ':' + min;
}

let rawRyanair = [];
if (fs.existsSync(ryanairPath)) {
  try {
    rawRyanair = JSON.parse(fs.readFileSync(ryanairPath, 'utf8'));
  } catch (e) {
    console.warn('Could not parse ryanair_flights_lzib.json:', e);
  }
}

const ryanairEnriched = rawRyanair.filter(f => f.airline === 'Ryanair' || !f.airline).map(f => ({
  ...f,
  airline: 'Ryanair',
  airline_icao: 'RYR',
  airline_iata: 'FR',
  aircraft_type: f.aircraft_type || 'B738'
}));

const newFlights = [];
for (const cfg of routes) {
  const depApt = airports[cfg.fromIcao];
  const arrApt = airports[cfg.toIcao];
  if (!depApt || !arrApt) {
    console.warn('Unknown airport in route:', cfg.fromIcao, cfg.toIcao);
    continue;
  }
  const dist = haversineDistance(depApt.lat, depApt.lon, arrApt.lat, arrApt.lon);
  const duration = calculateDuration(dist);

  const depOutMins = timeToMins(cfg.depTimeOutLocal);
  const depOutUtcMins = depOutMins - (depApt.tz * 60);
  const arrOutUtcMins = depOutUtcMins + duration;
  const arrOutMins = arrOutUtcMins + (arrApt.tz * 60);

  const turnaround = cfg.turnaroundMins || 60;
  const depInMins = arrOutMins + turnaround;
  const depInUtcMins = depInMins - (arrApt.tz * 60);
  const arrInUtcMins = depInUtcMins + duration;
  const arrInMins = arrInUtcMins + (depApt.tz * 60);

  for (const day of cfg.daysOfWeek) {
    newFlights.push({
      airline: cfg.airline,
      airline_icao: cfg.airline_icao,
      airline_iata: cfg.airline_iata,
      aircraft_type: cfg.aircraft_type,
      departure_icao: cfg.fromIcao,
      departure_city: depApt.city,
      departure_country: depApt.country,
      arrival_icao: cfg.toIcao,
      arrival_city: arrApt.city,
      arrival_country: arrApt.country,
      flight_number: cfg.airline_iata + ' ' + cfg.flightNumOut,
      callsign: cfg.callsignOut || (cfg.airline_icao + cfg.flightNumOut),
      departure_time: minsToTime(depOutMins),
      departure_time_utc: minsToTime(depOutUtcMins),
      arrival_time: minsToTime(arrOutMins),
      arrival_time_utc: minsToTime(arrOutUtcMins),
      duration_minutes: duration,
      day_of_operation: day,
      homebase: cfg.fromIcao,
      departure_lat: depApt.lat,
      departure_lon: depApt.lon,
      arrival_lat: arrApt.lat,
      arrival_lon: arrApt.lon,
      days_of_operation: cfg.daysOfWeek
    });

    newFlights.push({
      airline: cfg.airline,
      airline_icao: cfg.airline_icao,
      airline_iata: cfg.airline_iata,
      aircraft_type: cfg.aircraft_type,
      departure_icao: cfg.toIcao,
      departure_city: arrApt.city,
      departure_country: arrApt.country,
      arrival_icao: cfg.fromIcao,
      arrival_city: depApt.city,
      arrival_country: depApt.country,
      flight_number: cfg.airline_iata + ' ' + cfg.flightNumIn,
      callsign: cfg.callsignIn || (cfg.airline_icao + cfg.flightNumIn),
      departure_time: minsToTime(depInMins),
      departure_time_utc: minsToTime(depInUtcMins),
      arrival_time: minsToTime(arrInMins),
      arrival_time_utc: minsToTime(arrInUtcMins),
      duration_minutes: duration,
      day_of_operation: day,
      homebase: cfg.fromIcao,
      departure_lat: arrApt.lat,
      departure_lon: arrApt.lon,
      arrival_lat: depApt.lat,
      arrival_lon: depApt.lon,
      days_of_operation: cfg.daysOfWeek
    });
  }
}

const allFlights = [...ryanairEnriched, ...newFlights];
console.log(`Compiled ${allFlights.length} total flights across all airlines.`);

fs.writeFileSync(flightsOutPath, JSON.stringify(allFlights, null, 2) + '\n', 'utf8');
fs.writeFileSync(ryanairPath, JSON.stringify(allFlights, null, 2) + '\n', 'utf8');
