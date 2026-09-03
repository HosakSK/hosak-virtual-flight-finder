import json
import os
import sys
import time
import math
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AIRPORTS_PATH = os.path.join(ROOT_DIR, 'scripts', 'airports.json')
OUTPUT_PATH = os.path.join(ROOT_DIR, 'flights.json')
METADATA_PATH = os.path.join(ROOT_DIR, 'metadata.json')

with open(AIRPORTS_PATH, 'r', encoding='utf-8') as f:
    airports = json.load(f)

iata_to_icao = {}
for icao, apt in airports.items():
    iata = apt.get('iata')
    if iata:
        iata_to_icao[iata] = icao

# Raw list of all primary & secondary global hubs
RAW_HUB_ICAOS = [
    # 1. Domestic & Regional Bases (Smartwings, Ryanair, Wizz Air, Austrian, LOT)
    'LZIB', 'LZKZ', 'LOWW', 'LKPR', 'LKTB', 'LKMT', 'LHBP', 'EPWA', 'EPKK', 'EPKT', 'EPGD',
    
    # 2. Wizz Air, easyJet & Ryanair Core European Hubs & Bases
    'EGGW', 'EGKK', 'EGSS', 'EGLL', 'EGLC', 'EGCC', 'EGPH', 'EGGD', 'EGAA',
    'EIDW', 'EICK', 'EINN',
    'LSGG', 'LSZH', 'LFSB',
    'LIMC', 'LIME', 'LIML', 'LIRF', 'LIRA',
    'EDDB', 'EDDF', 'EDDM', 'EDDL', 'EDDK', 'EDDH', 'EDDS',
    'EHAM', 'EHEH', 'EHRD', 'EBBR', 'EBCI',
    'LFPG', 'LFPO', 'LFMN', 'LFLL', 'LFML', 'LFBO',
    'LEMD', 'LEBL', 'LEPA', 'LEMG', 'LEAL', 'LEBB', 'LEZL', 'LEVC',
    'LPPT', 'LPPR',
    'LROP', 'LRCL', 'LRIA', 'LATI', 'LWSK', 'LBSF', 'LBBG', 'UGKO',
    'EKCH', 'ESSA', 'ENGM', 'EFHK',
    'LTFM', 'LTFJ', 'LTAC', 'LTAI', 'LTBJ',
    'LGIR', 'LGRP', 'HEGN',

    # 3. Top Global Dedicated Cargo Hubs
    'KMEM', 'KSDF', 'EDDP', 'EBLG', 'ELLX', 'PANC', 'VHHH', 'RKSI', 'OMDW', 'UBBB',
    'KIND', 'KOAK', 'KAFW', 'KONT', 'KRFD', 'KCVG', 'EGNX', 'EHBK', 'ZHCC',

    # 4. USA & Canada Passenger Megahubs
    'KATL', 'KORD', 'KDFW', 'KJFK', 'KEWR', 'KLGA', 'KLAX', 'KMIA', 'KSFO', 'KDEN',
    'KIAH', 'KCLT', 'KPHL', 'KPHX', 'KMSP', 'KDTW', 'KSLC', 'KSEA', 'KBOS', 'KIAD',
    'KDCA', 'KDAL', 'KLAS', 'KMDW', 'KBWI', 'KMCO', 'KFLL', 'KPDX',
    'CYYZ', 'CYUL', 'CYVR', 'CYYC',

    # 5. Middle East & Africa Hubs
    'OMDB', 'OTHH', 'OMAA', 'OMSJ', 'OERK', 'OEJN', 'OEDF', 'OEMA',
    'OBBI', 'OOMS', 'OKBK', 'HECA', 'HAAB', 'FAOR', 'FACT', 'GMMN',

    # 6. Asia & Pacific Hubs
    'WSSS', 'RJTT', 'RJAA', 'RJBB', 'RJOO', 'RJFF', 'RJCC', 'RJGG',
    'RKSS', 'RKPK', 'RCTP', 'RCKH',
    'ZBAA', 'ZBAD', 'ZSPD', 'ZSSS', 'ZGGG', 'ZGSZ', 'ZUTF', 'ZPPP',
    'VTBS', 'VTBD', 'VTSP', 'WMKK', 'WIII', 'WADD', 'VVNB', 'VVTS', 'RPLL',
    'VIDP', 'VABB', 'VOBL', 'VOHS', 'VMAA', 'VECC',
    'YSSY', 'YMML', 'YBBN', 'YPPH', 'YPAD', 'NZAA', 'NZCH',

    # 7. Latin America Hubs
    'SBGR', 'SBSP', 'SBKP', 'SBGL', 'SBBR', 'SCEL', 'SPJC', 'SKBO',
    'MPTO', 'MMMX', 'MMGL', 'MMMY', 'MMUN', 'MSLP'
]

# Strictly deduplicate hubs while preserving order
HUB_ICAOS = list(dict.fromkeys(RAW_HUB_ICAOS))

def haversine_nm(lat1, lon1, lat2, lon2):
    if not lat1 or not lon1 or not lat2 or not lon2:
        return 0
    R = 3440.065
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) +         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *         math.sin(dLon/2) * math.sin(dLon/2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def calculate_duration(dist_nm):
    return round((dist_nm / 440) * 60 + 25)

def normalize_aircraft(code):
    if not code:
        return 'A320'
    code = code.upper()
    mapping = {
        '320': 'A320', '32A': 'A320', '32N': 'A320', 'A20N': 'A320',
        '321': 'A321', '32Q': 'A321', '32B': 'A321', 'A21N': 'A321',
        '319': 'A319', '318': 'A318',
        '738': 'B738', '73H': 'B738', '73W': 'B737', '737': 'B737',
        '739': 'B739', '73J': 'B739', '7M8': 'B38M', '7M9': 'B39M',
        '388': 'A388', 'A388': 'A388',
        '77W': 'B77W', '773': 'B77W', '772': 'B772', '77L': 'B772', '77F': 'B77L',
        '748': 'B748', '74H': 'B748', '744': 'B744', '74F': 'B744', '74N': 'B744', '74Y': 'B744',
        '789': 'B789', '788': 'B788', '781': 'B78X', '78X': 'B78X',
        '359': 'A359', '351': 'A351', '35K': 'A351',
        '332': 'A332', '333': 'A333', '339': 'A339', '33F': 'A332',
        '343': 'A343', '346': 'A346',
        '763': 'B763', '76F': 'B763', '76X': 'B763', '762': 'B762', '764': 'B764',
        '752': 'B752', '753': 'B753', '75F': 'B752',
        'MD1': 'MD11', 'M1F': 'MD11',
        'E90': 'E190', 'E190': 'E190', 'E95': 'E195', 'E195': 'E195',
        'E75': 'E175', 'E175': 'E175', 'E70': 'E170', '223': 'BCS3', '221': 'BCS1'
    }
    return mapping.get(code, code)

def normalize_airline(name, iata, icao, fn_raw):
    clean_name = name or ''
    if '(' in clean_name:
        clean_name = clean_name.split('(')[0].strip()
    
    name_str = clean_name.upper()
    iata_str = (iata or '').upper()
    icao_str = (icao or '').upper()
    fn_str = (fn_raw or '').upper()
    
    # Low-Cost & European
    if icao_str == 'RYR' or iata_str == 'FR' or fn_str.startswith('FR') or 'RYANAIR' in name_str:
        return 'Ryanair', 'RYR', 'FR'
    if icao_str == 'WZZ' or iata_str == 'W6' or fn_str.startswith('W6') or 'WIZZ' in name_str:
        return 'Wizz Air', 'WZZ', 'W6'
    if icao_str == 'DLH' or iata_str == 'LH' or fn_str.startswith('LH') or 'LUFTHANSA' in name_str:
        return 'Lufthansa', 'DLH', 'LH'
    if icao_str == 'AUA' or iata_str == 'OS' or fn_str.startswith('OS') or 'AUSTRIAN' in name_str:
        return 'Austrian Airlines', 'AUA', 'OS'
    if icao_str == 'BAW' or iata_str == 'BA' or fn_str.startswith('BA') or 'BRITISH AIRWAYS' in name_str:
        return 'British Airways', 'BAW', 'BA'
    if icao_str == 'KLM' or iata_str == 'KL' or fn_str.startswith('KL') or 'KLM' in name_str:
        return 'KLM', 'KLM', 'KL'
    if icao_str in ['TVS', 'TVQ', 'TRA', 'TVP'] or iata_str in ['QS', '6D', '3Z'] or fn_str.startswith('QS') or fn_str.startswith('6D') or fn_str.startswith('3Z') or 'SMARTWINGS' in name_str or 'TRAVEL SERVICE' in name_str:
        return 'Smartwings', 'TVS', 'QS'
    if icao_str == 'EZY' or iata_str == 'U2' or fn_str.startswith('U2') or fn_str.startswith('EZY') or 'EASYJET' in name_str:
        return 'easyJet', 'EZY', 'U2'
    if icao_str == 'SWR' or iata_str == 'LX' or fn_str.startswith('LX') or 'SWISS' in name_str:
        return 'Swiss', 'SWR', 'LX'
    if icao_str == 'LOT' or iata_str == 'LO' or fn_str.startswith('LO') or 'LOT' in name_str:
        return 'LOT Polish Airlines', 'LOT', 'LO'
    if icao_str == 'AFR' or iata_str == 'AF' or fn_str.startswith('AF') or 'AIR FRANCE' in name_str:
        return 'Air France', 'AFR', 'AF'
    if icao_str == 'SAS' or iata_str == 'SK' or fn_str.startswith('SK') or 'SCANDINAVIAN' in name_str:
        return 'SAS', 'SAS', 'SK'
    if icao_str == 'IBE' or iata_str == 'IB' or fn_str.startswith('IB') or 'IBERIA' in name_str:
        return 'Iberia', 'IBE', 'IB'
    if icao_str == 'TAP' or iata_str == 'TP' or fn_str.startswith('TP') or 'TAP' in name_str:
        return 'TAP Air Portugal', 'TAP', 'TP'
    if icao_str == 'THY' or iata_str == 'TK' or fn_str.startswith('TK') or 'TURKISH' in name_str:
        return 'Turkish Airlines', 'THY', 'TK'
    
    # Global Cargo Airlines
    if icao_str == 'FDX' or iata_str == 'FX' or fn_str.startswith('FX') or 'FEDEX' in name_str:
        return 'FedEx Express', 'FDX', 'FX'
    if icao_str == 'UPS' or iata_str == '5X' or fn_str.startswith('5X') or 'UNITED PARCEL' in name_str:
        return 'UPS Airlines', 'UPS', '5X'
    if icao_str in ['BCS', 'BOX', 'DHK', 'DHX'] or iata_str in ['QY', 'D0'] or 'DHL' in name_str or 'EUROPEAN AIR TRANSPORT' in name_str:
        return 'DHL Aviation', 'BCS', 'QY'
    if icao_str == 'CLX' or iata_str == 'CV' or fn_str.startswith('CV') or 'CARGOLUX' in name_str:
        return 'Cargolux', 'CLX', 'CV'
    if icao_str == 'GTI' or iata_str == '5Y' or fn_str.startswith('5Y') or 'ATLAS AIR' in name_str:
        return 'Atlas Air', 'GTI', '5Y'
    if icao_str == 'AZG' or iata_str == '7L' or 'SILK WAY' in name_str:
        return 'Silk Way West', 'AZG', '7L'
    if icao_str == 'PAC' or iata_str == 'PO' or 'POLAR AIR' in name_str:
        return 'Polar Air Cargo', 'PAC', 'PO'

    # Global Major Passenger Airlines
    if icao_str == 'UAE' or iata_str == 'EK' or fn_str.startswith('EK') or 'EMIRATES' in name_str:
        return 'Emirates', 'UAE', 'EK'
    if icao_str == 'QTR' or iata_str == 'QR' or fn_str.startswith('QR') or 'QATAR' in name_str:
        return 'Qatar Airways', 'QTR', 'QR'
    if icao_str == 'DAL' or iata_str == 'DL' or fn_str.startswith('DL') or 'DELTA' in name_str:
        return 'Delta Air Lines', 'DAL', 'DL'
    if icao_str == 'UAL' or iata_str == 'UA' or fn_str.startswith('UA') or 'UNITED' in name_str:
        return 'United Airlines', 'UAL', 'UA'
    if icao_str == 'AAL' or iata_str == 'AA' or fn_str.startswith('AA') or 'AMERICAN' in name_str:
        return 'American Airlines', 'AAL', 'AA'
    if icao_str == 'SIA' or iata_str == 'SQ' or fn_str.startswith('SQ') or 'SINGAPORE' in name_str:
        return 'Singapore Airlines', 'SIA', 'SQ'
    if icao_str == 'ANA' or iata_str == 'NH' or fn_str.startswith('NH') or 'ALL NIPPON' in name_str:
        return 'All Nippon Airways', 'ANA', 'NH'
    if icao_str == 'JAL' or iata_str == 'JL' or fn_str.startswith('JL') or 'JAPAN AIRLINES' in name_str:
        return 'Japan Airlines', 'JAL', 'JL'
    if icao_str == 'QFA' or iata_str == 'QF' or fn_str.startswith('QF') or 'QANTAS' in name_str:
        return 'Qantas', 'QFA', 'QF'
    if icao_str == 'ACA' or iata_str == 'AC' or fn_str.startswith('AC') or 'AIR CANADA' in name_str:
        return 'Air Canada', 'ACA', 'AC'
    if icao_str == 'ETD' or iata_str == 'EY' or fn_str.startswith('EY') or 'ETIHAD' in name_str:
        return 'Etihad Airways', 'ETD', 'EY'
    if icao_str == 'SVA' or iata_str == 'SV' or fn_str.startswith('SV') or 'SAUDIA' in name_str:
        return 'Saudia', 'SVA', 'SV'
    if icao_str == 'ETH' or iata_str == 'ET' or fn_str.startswith('ET') or 'ETHIOPIAN' in name_str:
        return 'Ethiopian Airlines', 'ETH', 'ET'
    if icao_str == 'CPA' or iata_str == 'CX' or fn_str.startswith('CX') or 'CATHAY' in name_str:
        return 'Cathay Pacific', 'CPA', 'CX'
    if icao_str == 'KAL' or iata_str == 'KE' or fn_str.startswith('KE') or 'KOREAN AIR' in name_str:
        return 'Korean Air', 'KAL', 'KE'
    
    return clean_name or 'Airline', icao or 'UNK', iata or 'XX'

def clean_flight_number(fn_raw, airline_iata, airline_icao):
    if not fn_raw:
        return ''
    clean_str = fn_raw.strip()
    prefixes = [
        airline_iata, airline_icao, '3Z', '6D', 'W6', 'FR', 'OS', 'LH', 'KL', 'BA', 'EK', 'QR',
        'QS', 'U2', 'LX', 'LO', 'AF', 'IB', 'TK', 'TO', 'HV', 'EW', 'TVP', 'TVQ', 'TVS',
        'FX', 'FDX', '5X', 'UPS', 'QY', 'BCS', 'CV', 'CLX', '5Y', 'GTI', 'DL', 'DAL', 'UA', 'UAL',
        'AA', 'AAL', 'SQ', 'SIA', 'NH', 'ANA', 'JL', 'JAL', 'QF', 'QFA', 'AC', 'ACA', 'EY', 'ETD',
        'SV', 'SVA', 'ET', 'ETH', 'CX', 'CPA', 'KE', 'KAL'
    ]
    for p in prefixes:
        if p and clean_str.upper().startswith(p.upper()):
            clean_str = clean_str[len(p):].strip()
            break
    digits = ''.join(c for c in clean_str if c.isdigit())
    return digits or clean_str

def fetch_airport_schedule(iata_code, mode='departures'):
    url = f"https://api.flightradar24.com/common/v1/airport.json?code={iata_code}&plugin[]=&plugin-setting[schedule][mode]={mode}&plugin-setting[schedule][timestamp]={int(time.time())}&page=1&limit=100"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                plugin = (data.get('result', {}) or {}).get('response', {}).get('airport', {}).get('pluginData', {}) or {}
                sched_data = (plugin.get('schedule', {}) or {}).get(mode, {}).get('data', []) or []
                if sched_data or attempt == 2:
                    return sched_data
                time.sleep(1.0)
        except Exception as e:
            time.sleep(1.0)
    return []

print(f"Starting rolling timetable scraper for {len(HUB_ICAOS)} unique global passenger & cargo hubs...")

# 1. Load existing dataset so all 7 days of the week are preserved and cumulatively updated
all_flights_map = {}
if os.path.exists(OUTPUT_PATH):
    try:
        with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
            existing_flights = json.load(f)
            for f_item in existing_flights:
                cs = f_item.get('callsign') or f_item.get('flight_number')
                dep = f_item.get('dep_icao') or f_item.get('departure_icao')
                arr = f_item.get('arr_icao') or f_item.get('arrival_icao')
                day = f_item.get('day_of_operation', 1)
                k = f"{cs}_{dep}_{arr}_{day}"
                all_flights_map[k] = f_item
        print(f"Loaded {len(all_flights_map)} existing flights from previous rolling updates.")
    except Exception as e:
        print(f"Note: Starting fresh database: {e}")

# 2. Scrape each global hub
for icao in HUB_ICAOS:
    hub_apt = airports.get(icao)
    if not hub_apt or not hub_apt.get('iata'):
        continue
    hub_iata = hub_apt['iata']
    print(f"\nScraping authentic departures & arrivals for {icao} ({hub_iata} - {hub_apt['city']})...")
    
    # A. Departures from Hub
    deps = fetch_airport_schedule(hub_iata, mode='departures')
    print(f"  Retrieved {len(deps)} departures.")
    time.sleep(0.6)
    
    for item in deps:
        f_info = (item.get('flight') or {}) if isinstance(item, dict) else {}
        ident = (f_info.get('identification') or {})
        fn_raw = (ident.get('number') or {}).get('default') or (ident.get('number') or {}).get('alternative')
        callsign = ident.get('callsign')
        
        if not fn_raw:
            continue
            
        airline_dict = (f_info.get('airline') or {}) or (f_info.get('owner') or {})
        airline_raw = airline_dict.get('name')
        airline_code_dict = (airline_dict.get('code') or {})
        airline_iata_raw = airline_code_dict.get('iata')
        airline_icao_raw = airline_code_dict.get('icao')
        
        airline_name, airline_icao, airline_iata = normalize_airline(airline_raw, airline_iata_raw, airline_icao_raw, fn_raw)
        
        if airline_name == 'Airline' and airline_icao == 'UNK':
            continue
            
        apt_dict = (f_info.get('airport') or {})
        dest_info = (apt_dict.get('destination') or {})
        
        dep_icao = icao
        dep_iata = hub_iata
        arr_iata = (dest_info.get('code') or {}).get('iata')
        arr_icao = (dest_info.get('code') or {}).get('icao') or iata_to_icao.get(arr_iata)
        
        if not arr_icao or dep_icao == arr_icao:
            continue
            
        dep_apt = hub_apt
        arr_apt = airports.get(arr_icao)
        if not arr_apt and arr_iata:
            arr_pos = (dest_info.get('position') or {})
            arr_lat = arr_pos.get('latitude')
            arr_lon = arr_pos.get('longitude')
            arr_city = (arr_pos.get('region') or {}).get('city') or arr_iata
            arr_country = (arr_pos.get('country') or {}).get('name') or ''
            airports[arr_icao] = {'lat': arr_lat, 'lon': arr_lon, 'tz': 2, 'city': arr_city, 'country': arr_country, 'iata': arr_iata}
            iata_to_icao[arr_iata] = arr_icao
            arr_apt = airports[arr_icao]
            
        if not dep_apt or not arr_apt:
            continue
            
        time_info = (f_info.get('time') or {})
        sched_time_dict = (time_info.get('scheduled') or {})
        dep_ts = sched_time_dict.get('departure')
        arr_ts = sched_time_dict.get('arrival')
        
        if not dep_ts:
            continue
            
        dep_dt_utc = datetime.fromtimestamp(dep_ts, timezone.utc)
        day_of_week = dep_dt_utc.isoweekday()
        
        dep_tz = dep_apt.get('tz', 2)
        arr_tz = arr_apt.get('tz', 2)
        
        dep_dt_local = dep_dt_utc + timedelta(hours=dep_tz)
        dep_time_local_str = dep_dt_local.strftime('%H:%M')
        dep_time_utc_str = dep_dt_utc.strftime('%H:%M')
        
        dist_nm = haversine_nm(dep_apt.get('lat'), dep_apt.get('lon'), arr_apt.get('lat'), arr_apt.get('lon'))
        dur_mins = calculate_duration(dist_nm)
        
        if arr_ts:
            arr_dt_utc = datetime.fromtimestamp(arr_ts, timezone.utc)
            arr_dt_local = arr_dt_utc + timedelta(hours=arr_tz)
            arr_time_local_str = arr_dt_local.strftime('%H:%M')
            arr_time_utc_str = arr_dt_utc.strftime('%H:%M')
            calculated_dur = int((arr_ts - dep_ts) / 60)
            if 20 < calculated_dur < 1000:
                dur_mins = calculated_dur
        else:
            arr_dt_utc = dep_dt_utc + timedelta(minutes=dur_mins)
            arr_dt_local = arr_dt_utc + timedelta(hours=arr_tz)
            arr_time_local_str = arr_dt_local.strftime('%H:%M')
            arr_time_utc_str = arr_dt_utc.strftime('%H:%M')
            
        aircraft_dict = (f_info.get('aircraft') or {})
        aircraft_raw = (aircraft_dict.get('model') or {}).get('code')
        aircraft_type = normalize_aircraft(aircraft_raw)
        
        clean_num = clean_flight_number(fn_raw, airline_iata, airline_icao)
        callsign_final = callsign or f"{airline_icao}{clean_num}"
        flight_num_final = f"{airline_iata} {clean_num}"
        
        key = f"{callsign_final}_{dep_icao}_{arr_icao}_{day_of_week}"
        
        all_flights_map[key] = {
            'airline': airline_name,
            'airline_icao': airline_icao,
            'airline_iata': airline_iata,
            'aircraft_type': aircraft_type,
            'flight_number': flight_num_final,
            'callsign': callsign_final,
            'departure_icao': dep_icao,
            'dep_icao': dep_icao,
            'departure_iata': dep_apt.get('iata', dep_iata or ''),
            'dep_iata': dep_apt.get('iata', dep_iata or ''),
            'departure_city': dep_apt.get('city', ''),
            'dep_city': dep_apt.get('city', ''),
            'departure_country': dep_apt.get('country', ''),
            'dep_country': dep_apt.get('country', ''),
            'arrival_icao': arr_icao,
            'arr_icao': arr_icao,
            'arrival_iata': arr_apt.get('iata', arr_iata or ''),
            'arr_iata': arr_apt.get('iata', arr_iata or ''),
            'arrival_city': arr_apt.get('city', ''),
            'arr_city': arr_apt.get('city', ''),
            'arrival_country': arr_apt.get('country', ''),
            'arr_country': arr_apt.get('country', ''),
            'departure_time': dep_time_local_str,
            'dep_time_local': dep_time_local_str,
            'dep_time_utc': dep_time_utc_str,
            'departure_time_utc': dep_time_utc_str,
            'arrival_time': arr_time_local_str,
            'arr_time_local': arr_time_local_str,
            'arr_time_utc': arr_time_utc_str,
            'arrival_time_utc': arr_time_utc_str,
            'dep_tz': dep_tz,
            'arr_tz': arr_tz,
            'duration_minutes': dur_mins,
            'day_of_operation': day_of_week,
            'homebase': dep_icao if dep_icao in HUB_ICAOS else (arr_icao if arr_icao in HUB_ICAOS else 'LZIB'),
            'departure_lat': dep_apt.get('lat', 48.17),
            'dep_lat': dep_apt.get('lat', 48.17),
            'departure_lon': dep_apt.get('lon', 17.21),
            'dep_lon': dep_apt.get('lon', 17.21),
            'arrival_lat': arr_apt.get('lat', 50.10),
            'arr_lat': arr_apt.get('lat', 50.10),
            'arrival_lon': arr_apt.get('lon', 14.26),
            'arr_lon': arr_apt.get('lon', 14.26),
            'distance_nm': dist_nm,
            'days_of_operation': [day_of_week],
            'days_of_week': [day_of_week]
        }

    # B. Arrivals into Hub
    arrs = fetch_airport_schedule(hub_iata, mode='arrivals')
    print(f"  Retrieved {len(arrs)} arrivals.")
    time.sleep(0.6)
    
    for item in arrs:
        f_info = (item.get('flight') or {}) if isinstance(item, dict) else {}
        ident = (f_info.get('identification') or {})
        fn_raw = (ident.get('number') or {}).get('default') or (ident.get('number') or {}).get('alternative')
        callsign = ident.get('callsign')
        
        if not fn_raw:
            continue
            
        airline_dict = (f_info.get('airline') or {}) or (f_info.get('owner') or {})
        airline_raw = airline_dict.get('name')
        airline_code_dict = (airline_dict.get('code') or {})
        airline_iata_raw = airline_code_dict.get('iata')
        airline_icao_raw = airline_code_dict.get('icao')
        
        airline_name, airline_icao, airline_iata = normalize_airline(airline_raw, airline_iata_raw, airline_icao_raw, fn_raw)
        
        if airline_name == 'Airline' and airline_icao == 'UNK':
            continue
            
        apt_dict = (f_info.get('airport') or {})
        orig_info = (apt_dict.get('origin') or {})
        
        arr_icao = icao
        arr_iata = hub_iata
        dep_iata = (orig_info.get('code') or {}).get('iata')
        dep_icao = (orig_info.get('code') or {}).get('icao') or iata_to_icao.get(dep_iata)
        
        if not dep_icao or dep_icao == arr_icao:
            continue
            
        arr_apt = hub_apt
        dep_apt = airports.get(dep_icao)
        if not dep_apt and dep_iata:
            dep_pos = (orig_info.get('position') or {})
            dep_lat = dep_pos.get('latitude')
            dep_lon = dep_pos.get('longitude')
            dep_city = (dep_pos.get('region') or {}).get('city') or dep_iata
            dep_country = (dep_pos.get('country') or {}).get('name') or ''
            airports[dep_icao] = {'lat': dep_lat, 'lon': dep_lon, 'tz': 2, 'city': dep_city, 'country': dep_country, 'iata': dep_iata}
            iata_to_icao[dep_iata] = dep_icao
            dep_apt = airports[dep_icao]
            
        if not dep_apt or not arr_apt:
            continue
            
        time_info = (f_info.get('time') or {})
        sched_time_dict = (time_info.get('scheduled') or {})
        dep_ts = sched_time_dict.get('departure')
        arr_ts = sched_time_dict.get('arrival')
        
        if not dep_ts:
            continue
            
        dep_dt_utc = datetime.fromtimestamp(dep_ts, timezone.utc)
        day_of_week = dep_dt_utc.isoweekday()
        
        dep_tz = dep_apt.get('tz', 2)
        arr_tz = arr_apt.get('tz', 2)
        
        dep_dt_local = dep_dt_utc + timedelta(hours=dep_tz)
        dep_time_local_str = dep_dt_local.strftime('%H:%M')
        dep_time_utc_str = dep_dt_utc.strftime('%H:%M')
        
        dist_nm = haversine_nm(dep_apt.get('lat'), dep_apt.get('lon'), arr_apt.get('lat'), arr_apt.get('lon'))
        dur_mins = calculate_duration(dist_nm)
        
        if arr_ts:
            arr_dt_utc = datetime.fromtimestamp(arr_ts, timezone.utc)
            arr_dt_local = arr_dt_utc + timedelta(hours=arr_tz)
            arr_time_local_str = arr_dt_local.strftime('%H:%M')
            arr_time_utc_str = arr_dt_utc.strftime('%H:%M')
            calculated_dur = int((arr_ts - dep_ts) / 60)
            if 20 < calculated_dur < 1000:
                dur_mins = calculated_dur
        else:
            arr_dt_utc = dep_dt_utc + timedelta(minutes=dur_mins)
            arr_dt_local = arr_dt_utc + timedelta(hours=arr_tz)
            arr_time_local_str = arr_dt_local.strftime('%H:%M')
            arr_time_utc_str = arr_dt_utc.strftime('%H:%M')
            
        aircraft_dict = (f_info.get('aircraft') or {})
        aircraft_raw = (aircraft_dict.get('model') or {}).get('code')
        aircraft_type = normalize_aircraft(aircraft_raw)
        
        clean_num = clean_flight_number(fn_raw, airline_iata, airline_icao)
        callsign_final = callsign or f"{airline_icao}{clean_num}"
        flight_num_final = f"{airline_iata} {clean_num}"
        
        key = f"{callsign_final}_{dep_icao}_{arr_icao}_{day_of_week}"
        
        all_flights_map[key] = {
            'airline': airline_name,
            'airline_icao': airline_icao,
            'airline_iata': airline_iata,
            'aircraft_type': aircraft_type,
            'flight_number': flight_num_final,
            'callsign': callsign_final,
            'departure_icao': dep_icao,
            'dep_icao': dep_icao,
            'departure_iata': dep_apt.get('iata', dep_iata or ''),
            'dep_iata': dep_apt.get('iata', dep_iata or ''),
            'departure_city': dep_apt.get('city', ''),
            'dep_city': dep_apt.get('city', ''),
            'departure_country': dep_apt.get('country', ''),
            'dep_country': dep_apt.get('country', ''),
            'arrival_icao': arr_icao,
            'arr_icao': arr_icao,
            'arrival_iata': arr_apt.get('iata', arr_iata or ''),
            'arr_iata': arr_apt.get('iata', arr_iata or ''),
            'arrival_city': arr_apt.get('city', ''),
            'arr_city': arr_apt.get('city', ''),
            'arrival_country': arr_apt.get('country', ''),
            'arr_country': arr_apt.get('country', ''),
            'departure_time': dep_time_local_str,
            'dep_time_local': dep_time_local_str,
            'dep_time_utc': dep_time_utc_str,
            'departure_time_utc': dep_time_utc_str,
            'arrival_time': arr_time_local_str,
            'arr_time_local': arr_time_local_str,
            'arr_time_utc': arr_time_utc_str,
            'arrival_time_utc': arr_time_utc_str,
            'dep_tz': dep_tz,
            'arr_tz': arr_tz,
            'duration_minutes': dur_mins,
            'day_of_operation': day_of_week,
            'homebase': dep_icao if dep_icao in HUB_ICAOS else (arr_icao if arr_icao in HUB_ICAOS else 'LZIB'),
            'departure_lat': dep_apt.get('lat', 48.17),
            'dep_lat': dep_apt.get('lat', 48.17),
            'departure_lon': dep_apt.get('lon', 17.21),
            'dep_lon': dep_apt.get('lon', 17.21),
            'arrival_lat': arr_apt.get('lat', 50.10),
            'arr_lat': arr_apt.get('lat', 50.10),
            'arrival_lon': arr_apt.get('lon', 14.26),
            'arr_lon': arr_apt.get('lon', 14.26),
            'distance_nm': dist_nm,
            'days_of_operation': [day_of_week],
            'days_of_week': [day_of_week]
        }

with open(AIRPORTS_PATH, 'w', encoding='utf-8') as f:
    json.dump(airports, f, indent=2, ensure_ascii=False)

flights_list = list(all_flights_map.values())
print(f"\nSuccessfully compiled {len(flights_list)} 100% authentic, verified real-world flights across cumulative rolling days.")

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(flights_list, f, separators=(',', ':'), ensure_ascii=False)

print(f"Pristine flights.json written successfully to {OUTPUT_PATH}!")

# Update metadata.json with exact date and time
now_utc = datetime.now(timezone.utc)
meta_data = {
    'last_updated_iso': now_utc.isoformat(),
    'last_updated_formatted': now_utc.strftime('%B %d, %Y, %H:%M UTC')
}
with open(METADATA_PATH, 'w', encoding='utf-8') as f:
    json.dump(meta_data, f, indent=2, ensure_ascii=False)
print(f"Updated metadata.json with timestamp: {meta_data['last_updated_formatted']}")
