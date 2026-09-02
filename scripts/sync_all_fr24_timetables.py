import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone

ROOT_DIR = 'c:/Users/jakub/Web_projekty/Virtual-Flight-Finder'
ROUTES_PATH = os.path.join(ROOT_DIR, 'scripts', 'routes.json')
AIRPORTS_PATH = os.path.join(ROOT_DIR, 'scripts', 'airports.json')

with open(AIRPORTS_PATH, 'r', encoding='utf-8') as f:
    airports = json.load(f)

with open(ROUTES_PATH, 'r', encoding='utf-8') as f:
    routes = json.load(f)

def get_fr24_flight_schedule(flight_str):
    clean_fn = flight_str.replace(" ", "").upper()
    url = f"https://api.flightradar24.com/common/v1/flight/list.json?query={clean_fn}&fetchBy=flight&page=1&limit=5"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            data_list = data.get('result', {}).get('response', {}).get('data', [])
            if not data_list:
                return None
            item = data_list[0]
            orig_iata = item.get('airport', {}).get('origin', {}).get('code', {}).get('iata')
            dest_iata = item.get('airport', {}).get('destination', {}).get('code', {}).get('iata')
            dep_ts = item.get('time', {}).get('scheduled', {}).get('departure')
            arr_ts = item.get('time', {}).get('scheduled', {}).get('arrival')
            ac_code = item.get('aircraft', {}).get('model', {}).get('code')
            callsign = item.get('identification', {}).get('callsign')
            
            if not dep_ts:
                return None
                
            dep_dt_utc = datetime.fromtimestamp(dep_ts, timezone.utc)
            arr_dt_utc = datetime.fromtimestamp(arr_ts, timezone.utc) if arr_ts else None
            
            return {
                'orig_iata': orig_iata,
                'dest_iata': dest_iata,
                'dep_utc': dep_dt_utc.strftime('%H:%M'),
                'arr_utc': arr_dt_utc.strftime('%H:%M') if arr_dt_utc else None,
                'ac_code': ac_code,
                'callsign': callsign
            }
    except Exception as e:
        return None

def mins_to_time(m):
    m = (m % 1440 + 1440) % 1440
    h = str(m // 60).zfill(2)
    min_val = str(m % 60).zfill(2)
    return f"{h}:{min_val}"

def time_to_mins(t_str):
    if not t_str:
        return 0
    parts = t_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])

print(f"Starting Flightradar24 automated real timetable sync for {len(routes)} routes...")
updated_count = 0

for i, r in enumerate(routes):
    airline = r.get('airline', '')
    iata = r.get('airline_iata', '')
    icao = r.get('airline_icao', '')
    from_icao = r.get('fromIcao')
    to_icao = r.get('toIcao')
    
    from_apt = airports.get(from_icao, {})
    to_apt = airports.get(to_icao, {})
    from_tz = from_apt.get('tz', 2)
    to_tz = to_apt.get('tz', 2)
    
    fn_out = r.get('flightNumOut')
    fn_in = r.get('flightNumIn')
    
    # 1. Outbound
    if fn_out and iata:
        full_fn_out = f"{iata}{fn_out}"
        sched_out = get_fr24_flight_schedule(full_fn_out)
        if sched_out and sched_out.get('dep_utc'):
            utc_mins = time_to_mins(sched_out['dep_utc'])
            local_mins = utc_mins + int(from_tz * 60)
            local_dep = mins_to_time(local_mins)
            if local_dep != r.get('depTimeOutLocal'):
                r['depTimeOutLocal'] = local_dep
                updated_count += 1
            if sched_out.get('callsign') and sched_out['callsign'] != r.get('callsignOut'):
                r['callsignOut'] = sched_out['callsign']
            time.sleep(0.08)
            
    # 2. Inbound
    if fn_in and iata:
        full_fn_in = f"{iata}{fn_in}"
        sched_in = get_fr24_flight_schedule(full_fn_in)
        if sched_in and sched_in.get('dep_utc'):
            utc_mins = time_to_mins(sched_in['dep_utc'])
            local_mins = utc_mins + int(to_tz * 60)
            local_dep = mins_to_time(local_mins)
            if local_dep != r.get('depTimeInLocal'):
                r['depTimeInLocal'] = local_dep
                updated_count += 1
            if sched_in.get('callsign') and sched_in['callsign'] != r.get('callsignIn'):
                r['callsignIn'] = sched_in['callsign']
            time.sleep(0.08)
            
    if (i + 1) % 50 == 0 or (i + 1) == len(routes):
        print(f"[{i+1}/{len(routes)}] Processed routes. Updated departures so far: {updated_count}")

# Save calibrated routes
with open(ROUTES_PATH, 'w', encoding='utf-8') as f:
    json.dump(routes, f, indent=2, ensure_ascii=False)

print(f"Done! Updated {updated_count} schedule entries in routes.json with live Flightradar24 data.")
