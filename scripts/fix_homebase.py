import json
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
# Check root or current directory
default_path = os.path.join(script_dir, "..", "ryanair_flights_lzib.json")
file_path = sys.argv[1] if len(sys.argv) > 1 else default_path

if not os.path.exists(file_path):
    # Try current directory
    if os.path.exists("ryanair_flights_lzib.json"):
        file_path = "ryanair_flights_lzib.json"

print(f"Applying systematic homebase correction to: {os.path.normpath(file_path)}")

with open(file_path, "r", encoding="utf-8") as f:
    flights = json.load(f)

def time_to_mins(t):
    h, m = map(int, t.split(':'))
    return h * 60 + m

for f in flights:
    # Set a default just in case
    f['homebase'] = 'LZIB' if f['departure_icao'] == 'LZIB' else f['departure_icao']

# Systematically fix based on turnaround
by_dest = {}
for f in flights:
    dest = f['arrival_icao'] if f['departure_icao'] == 'LZIB' else f['departure_icao']
    by_dest.setdefault(dest, []).append(f)

for dest, flist in by_dest.items():
    outbound = [f for f in flist if f['departure_icao'] == 'LZIB']
    inbound = [f for f in flist if f['arrival_icao'] == 'LZIB']
    
    # Try to pair them up
    for out_f in outbound:
        t_out_dep = time_to_mins(out_f['departure_time'])
        t_out_arr = t_out_dep + out_f['duration_minutes']
        
        paired_inbound = None
        turnaround_type = None
        min_turnaround = 9999
        
        for in_f in inbound:
            if in_f.get('day_of_operation') != out_f.get('day_of_operation'):
                continue
                
            t_in_dep = time_to_mins(in_f['departure_time'])
            t_in_arr = t_in_dep + in_f['duration_minutes']
            
            # Scenario A: Aircraft based in LZIB
            # Flies LZIB -> DEST, turns around at DEST, flies DEST -> LZIB
            diff_A = t_in_dep - t_out_arr
            if diff_A < 0: diff_A += 24*60
            
            # Scenario B: Aircraft based in DEST
            # Flies DEST -> LZIB, turns around at LZIB, flies LZIB -> DEST
            diff_B = t_out_dep - t_in_arr
            if diff_B < 0: diff_B += 24*60
            
            if diff_A < min_turnaround and diff_A <= 120:
                min_turnaround = diff_A
                turnaround_type = 'LZIB'
                paired_inbound = in_f
                
            if diff_B < min_turnaround and diff_B <= 120:
                min_turnaround = diff_B
                turnaround_type = dest
                paired_inbound = in_f
        
        if paired_inbound and turnaround_type:
            out_f['homebase'] = turnaround_type
            paired_inbound['homebase'] = turnaround_type

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(flights, f, indent=2, ensure_ascii=False)

print(f"Systematic homebase correction completed in {os.path.normpath(file_path)}")
