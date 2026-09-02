# Virtual Flight Finder (vATC & X-Plane)

This is a dedicated web application designed for virtual pilots (X-Plane, MSFS, VATSIM/IVAO) to search and filter real flight plans (currently optimized for the Ryanair network and Bratislava LZIB airport).

The application is built to be extremely fast (all filtering is done on the client side) and has a clean, premium design.

## 🚀 Features

- **Live & Sim Modes**: A filter that allows you to find flights departing in the next few hours relative to your real time (Live mode), or fully manual filtering by simulator day and time (Sim mode).
- **UTC Conversion**: Automatic conversion of local departure/arrival times to UTC.
- **Easy Copying**: Clicking on an ICAO code, flight number, or callsign immediately copies the value without spaces to your clipboard (ideal for pasting into FMC/MCDU).
- **Google Maps Integration**: Cities are clickable links that open Google Maps directly.
- **Multi-Filter**: Ability to enter multiple ICAO codes for departure/arrival at once (separated by commas).
- **Swap Button**: A handy button to quickly swap origin and destination for return flight searches.

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+). We do not use any heavy frameworks like React.
- **Dev Server**: The application is integrated directly in the `public/finder/` folder of the project and can be loaded statically or via the Next.js development server.
- **Data**: Static `json` file located at `public/finder/ryanair_flights_lzib.json`.

## 🧠 Architecture (How it works)

- `index.html`: Contains the entire DOM structure and the layout of the sidebar filter panel.
- `style.css`: Custom design system.
- `main.js`: 
  - Downloads the `ryanair_flights_lzib.json` file upon loading.
  - Listens to events (`input`, `click`) from all filters.
  - The `applyFilters()` function iterates through the flights array and filters them based on the criteria.
  - The `render()` function generates HTML for the flight cards and injects it into the grid.

---

## 🔄 How to Update Data (For Developers)

The application's data comes from the real Ryanair API. Since flight schedules change periodically, the JSON file needs to be updated from time to time.

### Step 1: Downloading New Flights from the API
An Agent skill (saved as `update_ryanair_flights`) handles this process, running the modified `update_flights.py` script.

**Robust (Systematic) Download Logic:**
The original Ryanair "Fare Finder" API only returned *one cheapest flight per day*, ignoring sold-out flights. To get the **complete flight schedule**:
1. The script scans a period of **28 days** ahead (instead of 7) to ensure it captures flights that are fully booked in the coming days.
2. It divides each day into **4 time windows** (00:00-06:00, 06:00-12:00, etc.). The API queries each segment of the day separately, catching airports with multiple daily flights (e.g., London Stansted EGSS).
3. The script is fully **Timezone Aware**. It fetches the IANA timezone (e.g., `Europe/London`) for all airports, mathematically calculates, and saves UTC times (`departure_time_utc`, `arrival_time_utc`), which the web app reads directly.
4. **Day-Specific Flights**: Each flight for a specific weekday is saved and displayed as a separate card with its own real-world time. If flight FR5699 operates at different times on Mondays vs Fridays, the app renders two distinct cards. In the day indicators list, the primary day of that specific card shines prominently (with a subtle glow), while other operation days are dimmed.

To update, simply ask the AI Agent to update the flights ("Update Ryanair flights pre LZIB").

You can also run the update manually.

#### Prerequisites
Make sure the required Python packages are installed:
```bash
pip install ryanair-py airportsdata FlightRadarAPI
```

#### Step-by-Step Manual Execution:
1. **Download and Aggregate Flights:**
   Run the global update script (specifying the output JSON file location):
   ```bash
   python "C:\Users\jakub\.gemini\config\skills\update_ryanair_flights\scripts\update_flights.py" "public\finder\ryanair_flights_lzib.json"
   ```

2. **Systematic Homebase Correction:**
   Run the turnaround solver script to fix homebases based on routing times:
   ```bash
   python "scripts\fix_homebase.py"
   ```

### Step 2: Homebase Correction Algorithm
**This is a critical step for data integrity!**
The Ryanair API does not state whether LZIB is the aircraft's homebase or just a turnaround from an away-base. Correct base information is crucial for virtual pilots.

While the main `update_flights.py` script estimates base assignments during downloads, a standalone script performs a systematic correction.

#### How the fix_homebase algorithm works:
The algorithm loads the JSON file and mathematically pairs all departures and arrivals on the same route:
1. It finds a flight pair like **LZIB -> EPMO** and **EPMO -> LZIB** operating on the **same day** (`day_of_operation`).
2. It compares which flight of the pair departs from the home airport first in the morning.
3. If the aircraft departs first from LZIB to EPMO in the morning, **it means the aircraft is based in LZIB** (it started its day in Bratislava and parked there overnight).
4. If it departs first from EPMO to LZIB in the morning, **its homebase is EPMO**.

- **Running the script**: The script runs automatically as part of the agent skill after data retrieval, or manually via step 2 above.
*(This script modifies and rewrites the JSON file `public/finder/ryanair_flights_lzib.json` with corrected Base and UTC values).*

### Step 3: Callsign Synchronization
Airlines dynamically change ATC callsigns (e.g. from `RYR21AW` back to the commercial flight number `RYR9627`) due to operational requirements or seasonal ATC scheduling. This can cause discrepancies between the static JSON data and real-world flights.

If you notice that a flight's callsign doesn't match the real world anymore, you can run a quick standalone synchronization script that connects to FlightRadar24 and updates only the callsigns without downloading the entire schedule.

**Running the synchronization script:**
```bash
python scripts\update_callsigns.py
```
*(This script modifies the JSON file and updates the `callsign` property for all flights to match the latest FlightRadar24 data).*
