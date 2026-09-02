# ✈️ Virtual Flight Finder

> **Ultimate Flight Schedule, Dispatch & Weather Tool for Virtual Aviators (VATSIM, IVAO, X-Plane, MSFS, Prepar3D)**

![Virtual Flight Finder](https://img.shields.io/badge/Aviation-vATC%20%26%20FlightSim-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%2F%20CSS3-orange.svg)

Virtual Flight Finder is a fast, responsive, and glassmorphic web application built specifically for flight simulation enthusiasts and virtual pilots. It provides an intuitive interface to search, filter, and plan flights based on real airline flight schedules (currently featuring the full Ryanair schedule network with Bratislava LZIB and European routes).

---

## 🌟 Key Features

- **⚡ Blazing Fast Client-Side Search & Filtering**:
  - Filter by **Origin**, **Destination**, or multi-ICAO codes (e.g. `LZIB, EIDW, EGSS`).
  - **Route Swap**: Instant 1-click button to invert Origin and Destination for turnaround flights.
  - **Live Mode**: Find flights departing in the next $N$ hours relative to real time with live countdowns.
  - **Sim Mode**: Filter flights by specific day of the week and UTC time ranges for realistic flight simulation.
  - Filter by **Flight Duration** (min/max), **Homebase**, or **Callsign / Flight Number**.
  - **UTC / Local Time Toggle**: Switch between airport local times and UTC with automatic timezone resolution.
  - **Quick FMC Copy**: Click on any ICAO, callsign, or flight number to copy directly to clipboard for FMC/MCDU input.

- **🗺️ Interactive Dispatch & Route Modal**:
  - **Live Route & Map**: Visualizes the actual route and waypoints on an interactive Leaflet map.
  - **Flight Stats**: Shows distance in nautical miles (NM), suggested cruise flight level (FL), estimated flight time, and waypoint count.
  - **One-Click SimBrief Pre-Fill**: Opens SimBrief with departure, arrival, callsign, aircraft type, and route pre-loaded.
  - **SkyVector Integration**: Quick navigation to SkyVector aeronautical charts.

- **🌤️ Live Aviation Weather (METAR & TAF)**:
  - Fetches real-time METAR and TAF from AviationWeather.gov for departure and arrival airfields.
  - Graphical indicators for **Flight Category** (VFR, MVFR, IFR, LIFR), **Wind direction/speed**, and **Temperature/Dewpoint**.

- **📡 VATSIM Network Status**:
  - Automatically queries the VATSIM live data feed to display active controllers (DEL, GND, TWR, DEP, APP, CTR) at both departure and arrival airports.
  - Direct link to **LiveATC.net** streams where available.

- **🔍 External Flight Tracking Shortcuts**:
  - Instant links to search the flight on **Flightradar24**, **FlightAware**, **ADSB.fi**, **EDI-GLA**, and **Google**.

- **🌓 Dark & Light Theme**:
  - High-contrast, sleek aviation glassmorphism design with persistent theme preference in `localStorage`.

---

## 🚀 Quick Start

### Option 1: Zero-Dependency Node.js Server (Recommended)
You can run the built-in HTTP server with API proxies:

```bash
# Clone the repository
git clone https://github.com/HosakSK/Virtual-Flight-Finder.git
cd Virtual-Flight-Finder

# Start server
npm start
# or
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Option 2: Static Hosting (GitHub Pages, Netlify, Vercel, Live Server)
Since the application uses standard HTML5, CSS3, and ES6 modules, it can be served from any static file server:

```bash
npx serve .
# or
python -m http.server 8000
```

---

## 🔄 Updating Flight Data (Python Pipeline)

The flight dataset (`ryanair_flights_lzib.json`) is generated from real flight schedule APIs.

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Update Pipeline

```bash
# 1. Fetch fresh 28-day 4-window schedule from Ryanair API
python scripts/update_flights.py

# 2. Run systematic turnaround homebase correction
python scripts/fix_homebase.py

# 3. (Optional) Sync dynamic ATC callsigns with FlightRadar24
python scripts/update_callsigns.py
```

Or via npm:
```bash
npm run update:flights
npm run update:callsigns
```

### How the Data Pipeline Works:
1. **Timezone-Aware Ingestion (`update_flights.py`)**: Scans 28 days ahead across 4 daily time windows to capture all flights (including sold-out flights) and computes UTC departure and arrival times.
2. **Turnaround Homebase Solver (`fix_homebase.py`)**: Mathematically pairs outbound and inbound flights on the same day to accurately identify the overnight base airport.
3. **Callsign Sync (`update_callsigns.py`)**: Fetches active ATC callsigns (e.g. `RYR21AW` vs `RYR9627`) from FlightRadar24.

---

## 📁 Project Structure

```
Virtual-Flight-Finder/
├── index.html                   # Main UI entry point
├── style.css                    # Aviation glassmorphic design system
├── main.js                      # Application logic, filters, modal, weather & VATSIM APIs
├── ryanair_flights_lzib.json    # Flight schedule dataset
├── favicon.svg                  # Favicon
├── icons.svg                    # SVG icon sprite
├── server.js                    # Lightweight Node.js static server & API proxy
├── package.json                 # Project configuration & npm scripts
├── requirements.txt             # Python dependencies for scraper/update tools
├── scripts/
│   ├── update_flights.py        # Ryanair API schedule scraper
│   ├── fix_homebase.py          # Turnaround homebase correction script
│   └── update_callsigns.py      # Real-time FlightRadar24 callsign updater
├── docs/
│   └── finder.md                # Detailed technical documentation
├── .gitignore                   # Git ignore file
├── LICENSE                      # MIT License
└── README.md                    # Project documentation
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

Created by **Jakub Hostacny** ([hostacny@gmail.com](mailto:hostacny@gmail.com)).
