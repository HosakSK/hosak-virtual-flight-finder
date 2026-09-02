import json
import math
import sys
import os
import time
from datetime import datetime, timedelta
import zoneinfo
from ryanair import Ryanair
import airportsdata
from FlightRadarAPI import FlightRadar24API

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def estimate_duration(distance_km):
    return int((distance_km / 800) * 60 + 30)

def extract_location_info(full_name, iata_code, airports_dict):
    city = airports_dict.get(iata_code, {}).get('city', iata_code)
    country = airports_dict.get(iata_code, {}).get('country', "")
    
    if full_name:
        parts = full_name.split(', ')
        if len(parts) >= 2:
            city = parts[0]
            country = parts[1]
        else:
            city = full_name
            
    return city, country

def main():
    if len(sys.argv) < 2:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(script_dir, "..", "ryanair_flights_lzib.json")
    else:
        output_path = sys.argv[1]
    
    airports = airportsdata.load('IATA')
    api = Ryanair("EUR")
    fr_api = FlightRadar24API()
    today = datetime.today()
    
    outbound_flights_raw = []
    destinations = set()
    
    print("Fetching outbound flights from BTS (28 days, 4 time windows/day)...")
    time_windows = [("00:00", "05:59"), ("06:00", "11:59"), ("12:00", "17:59"), ("18:00", "23:59")]
    
    for i in range(28):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        for t_from, t_to in time_windows:
            try:
                flights = api.get_cheapest_flights("BTS", date_str, date_str, departure_time_from=t_from, departure_time_to=t_to)
                for f in flights:
                    outbound_flights_raw.append((date.isoweekday(), f))
                    destinations.add(f.destination)
            except Exception as e:
                pass

    inbound_flights_raw = []
    print(f"Fetching inbound flights from {len(destinations)} destinations (28 days, 4 time windows/day)...")
    for dest in destinations:
        for i in range(28):
            date = today + timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            for t_from, t_to in time_windows:
                try:
                    flights = api.get_cheapest_flights(dest, date_str, date_str, destination_airport="BTS", departure_time_from=t_from, departure_time_to=t_to)
                    for f in flights:
                        inbound_flights_raw.append((date.isoweekday(), f))
                except Exception as e:
                    pass

    all_flights = outbound_flights_raw + inbound_flights_raw
    
    # Calculate homebase for each destination
    homebases = {}
    for dest in destinations:
        earliest_outbound = "23:59"
        earliest_inbound = "23:59"
        
        for weekday, f in outbound_flights_raw:
            if f.destination == dest:
                t = f.departureTime.strftime("%H:%M")
                if t < earliest_outbound: earliest_outbound = t
                
        for weekday, f in inbound_flights_raw:
            if f.origin == dest:
                t = f.departureTime.strftime("%H:%M")
                if t < earliest_inbound: earliest_inbound = t
                
        dest_icao = airports.get(dest, {}).get('icao', dest)
        if earliest_outbound <= earliest_inbound:
            homebases[dest] = "LZIB"
        else:
            homebases[dest] = dest_icao

    schedule = {}
    flight_days = {}

    print("Processing schedule and fetching callsigns...")
    for local_weekday, f in all_flights:
        fn = f.flightNumber
        origin_iata = f.origin
        dest_iata = f.destination
        
        origin_icao = airports.get(origin_iata, {}).get('icao', origin_iata)
        dest_icao = airports.get(dest_iata, {}).get('icao', dest_iata)
        
        origin_city, origin_country = extract_location_info(f.originFull, origin_iata, airports)
        dest_city, dest_country = extract_location_info(f.destinationFull, dest_iata, airports)
        
        lat1 = airports.get(origin_iata, {}).get('lat', 0)
        lon1 = airports.get(origin_iata, {}).get('lon', 0)
        lat2 = airports.get(dest_iata, {}).get('lat', 0)
        lon2 = airports.get(dest_iata, {}).get('lon', 0)
        
        tz1 = airports.get(origin_iata, {}).get('tz', 'UTC')
        tz2 = airports.get(dest_iata, {}).get('tz', 'UTC')
        
        duration = 0
        if lat1 and lon1 and lat2 and lon2:
            duration = estimate_duration(haversine(lat1, lon1, lat2, lon2))
            
        try:
            dep_tz = zoneinfo.ZoneInfo(tz1)
            arr_tz = zoneinfo.ZoneInfo(tz2)
        except Exception:
            dep_tz = zoneinfo.ZoneInfo('UTC')
            arr_tz = zoneinfo.ZoneInfo('UTC')
            
        # Ryanair api returns local naive departure time
        dep_local = f.departureTime.replace(tzinfo=dep_tz)
        dep_utc = dep_local.astimezone(zoneinfo.ZoneInfo('UTC'))
        
        arr_utc = dep_utc + timedelta(minutes=duration)
        arr_local = arr_utc.astimezone(arr_tz)
        
        # Calculate actual UTC weekday
        utc_weekday = dep_utc.isoweekday()
        
        route_key = (fn, origin_iata, dest_iata)
        flight_days.setdefault(route_key, set()).add(utc_weekday)
        
        route_dest = f.destination if f.origin == "BTS" else f.origin
        homebase = homebases.get(route_dest, "UNKNOWN")
        
        callsign = ""
        try:
            fr_results = fr_api.search(fn.replace(" ", ""))
            if "schedule" in fr_results and len(fr_results["schedule"]) > 0:
                for sched in fr_results["schedule"]:
                    if sched["id"] == fn.replace(" ", ""):
                        callsign = sched.get("detail", {}).get("callsign", "")
                        break
        except Exception:
            pass
        time.sleep(0.1)
        
        key = (fn, utc_weekday)
        if key not in schedule:
            schedule[key] = {
                "departure_icao": origin_icao,
                "departure_city": origin_city,
                "departure_country": origin_country,
                "arrival_icao": dest_icao,
                "arrival_city": dest_city,
                "arrival_country": dest_country,
                "flight_number": fn,
                "callsign": callsign,
                "departure_time": dep_local.strftime("%H:%M"),
                "departure_time_utc": dep_utc.strftime("%H:%M"),
                "arrival_time": arr_local.strftime("%H:%M"),
                "arrival_time_utc": arr_utc.strftime("%H:%M"),
                "duration_minutes": duration,
                "day_of_operation": utc_weekday,
                "_flight_days_key": route_key,
                "homebase": homebase,
                "departure_lat": lat1,
                "departure_lon": lon1,
                "arrival_lat": lat2,
                "arrival_lon": lon2
            }

    output_list = []
    for key, data in schedule.items():
        route_key = data.pop("_flight_days_key")
        data["days_of_operation"] = sorted(list(flight_days[route_key]))
        output_list.append(data)

    output_list.sort(key=lambda x: (x["departure_icao"], x["day_of_operation"], x["departure_time"]))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output_list, f, indent=2)

    print(f"Successfully updated schedule. Found {len(output_list)} distinct flights. Saved to {output_path}")

if __name__ == "__main__":
    main()
