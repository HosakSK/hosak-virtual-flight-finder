import json
import time
import os
import sys
from FlightRadarAPI import FlightRadar24API

def update_callsigns(json_path):
    print(f"Loading {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    fr_api = FlightRadar24API()
    
    # Extract unique flight numbers
    unique_flights = set(f["flight_number"] for f in data)
    print(f"Found {len(unique_flights)} unique flights. Fetching updated callsigns from FlightRadar24...")
    
    callsign_map = {}
    
    for i, fn in enumerate(unique_flights):
        try:
            fr_results = fr_api.search(fn.replace(" ", ""))
            callsign = ""
            if "schedule" in fr_results and len(fr_results["schedule"]) > 0:
                for sched in fr_results["schedule"]:
                    if sched["id"] == fn.replace(" ", ""):
                        callsign = sched.get("detail", {}).get("callsign", "")
                        break
            if callsign:
                callsign_map[fn] = callsign
            print(f"[{i+1}/{len(unique_flights)}] {fn} -> {callsign if callsign else 'NOT FOUND'}")
        except Exception as e:
            print(f"[{i+1}/{len(unique_flights)}] Error fetching {fn}: {e}")
        time.sleep(0.2) # Polite delay
        
    print(f"Updating JSON file with new callsigns...")
    changes = 0
    for f in data:
        fn = f["flight_number"]
        if fn in callsign_map and callsign_map[fn] != f.get("callsign", ""):
            print(f"Update {fn}: {f.get('callsign', '')} -> {callsign_map[fn]}")
            f["callsign"] = callsign_map[fn]
            changes += 1
            
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Done! Updated {changes} callsigns in {json_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_path = os.path.join(script_dir, "..", "ryanair_flights_lzib.json")
    target_file = sys.argv[1] if len(sys.argv) > 1 else default_path
    
    if not os.path.exists(target_file) and os.path.exists("ryanair_flights_lzib.json"):
        target_file = "ryanair_flights_lzib.json"
        
    update_callsigns(target_file)
