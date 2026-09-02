# ✈️ Virtual Flight Finder

> **Ultimate Flight Schedule, Dispatch & Weather Tool for Virtual Aviators (VATSIM, IVAO, X-Plane, MSFS, Prepar3D)**

![Aviation](https://img.shields.io/badge/Aviation-vATC%20%26%20FlightSim-blue.svg)
![Airlines](https://img.shields.io/badge/Airlines-8%20European%20Carriers-orange.svg)
![Flights](https://img.shields.io/badge/Flights-1400%2B%20Schedules-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**Virtual Flight Finder** is a fast, responsive, and glassmorphic web application built specifically for virtual pilots and flight simulation enthusiasts. It provides an intuitive interface to search, filter, and plan flights across **8 major European airlines** with real airline routes, live weather (METAR/TAF), online VATSIM ATC status, interactive maps, and 1-click SimBrief dispatch.

---

## 🏢 Supported Airlines & Fleet

| Airline | ICAO / IATA | Main Hubs & Bases | Fleet Equipment |
| :--- | :--- | :--- | :--- |
| 🟡 **Ryanair** | `RYR` / `FR` | Dublin, London Stansted, Bergamo, Bratislava, Vienna, Madrid | `B738`, `B38M` |
| 🟣 **Wizz Air** | `WZZ` / `W6` | Budapest, London Luton, Vienna, Warsaw, Bratislava, Rome | `A320`, `A321`, `A21N` |
| 🟠 **easyJet** | `EZY` / `U2` | London Gatwick, Milan Malpensa, Amsterdam, Geneva, Paris | `A320`, `A321` |
| 🔵 **Lufthansa** | `DLH` / `LH` | Frankfurt am Main, Munich | `A320`, `A321` |
| 🔴 **British Airways** | `BAW` / `BA` | London Heathrow, London Gatwick, London City | `A320`, `A321`, `E190` |
| 🌐 **KLM Royal Dutch Airlines** | `KLM` / `KL` | Amsterdam Schiphol | `B738`, `E190`, `E295` |
| 🔶 **Smartwings** | `TVS` / `QS` | Prague, Bratislava, Košice, Brno, Ostrava, Budapest | `B738`, `B38M` |
| 🔴 **Austrian Airlines** | `AUA` / `OS` | Vienna International Airport | `A320`, `A321`, `E195` |

---

## 🌟 Key Features

- **⚡ Blazing Fast Client-Side Search & Filtering**:
  - **Airline Filter**: Switch between All Airlines or filter by individual airline (Ryanair, Wizz Air, easyJet, Lufthansa, British Airways, KLM, Smartwings, Austrian Airlines).
  - **Aircraft Type Filter**: Filter by equipment (`B738`, `B38M`, `A320`, `A321`, `A21N`, `E190`, `E195`).
  - **Origin / Destination Multi-ICAO**: Search by city or multiple airport codes (e.g. `LZIB, LOWW, EGLL, FRA`).
  - **Route Swap**: Instant 1-click button to invert Origin and Destination for turnaround flights.
  - **Live Mode**: Find flights departing in the next $N$ hours relative to real time with live departure countdowns.
  - **Sim Mode**: Filter flights by simulator day of the week and UTC departure time window.
  - **Duration & Callsign Filters**: Min/Max flight duration and direct callsign/flight number lookup.
  - **UTC / Local Time Toggle**: Switch between airport local times and UTC with automatic timezone resolution.
  - **Quick FMC Copy**: 1-click copy for ICAO codes, callsigns, and flight numbers for fast FMC/MCDU input.

- **🗺️ Interactive Dispatch & Route Modal**:
  - **Live Route & Map**: Visualizes the flight plan route, airway segments, and waypoints on an interactive Leaflet map.
  - **Flight Statistics**: Calculates distance in nautical miles (NM), suggested cruise flight level (FL), estimated flight time, and waypoint count.
  - **Dynamic SimBrief Pre-Fill**: 1-click export to SimBrief automatically configured with the airline ICAO, callsign, and exact airframe equipment (`B738`, `A21N`, `A320`, `E195`, etc.).
  - **SkyVector Integration**: Quick navigation to SkyVector aeronautical charts.

- **🌤️ Live Aviation Weather (METAR & TAF)**:
  - Real-time METAR and TAF directly from AviationWeather.gov for departure and arrival airfields.
  - Graphical indicators for **Flight Category** (VFR, MVFR, IFR, LIFR), **Wind direction & speed**, and **Temperature/Dewpoint**.

- **📡 VATSIM Network Status**:
  - Live query to the VATSIM data feed showing online controllers (Delivery, Ground, Tower, Departure, Radar) at departure and arrival airports.
  - Direct links to **LiveATC.net** streams where available.

- **🔍 External Flight Tracking Shortcuts**:
  - Quick links to search the flight on **Flightradar24**, **FlightAware**, **ADSB.fi**, **EDI-GLA**, and **Google**.

- **🌓 Dark & Light Theme**:
  - High-contrast aviation glassmorphism design with persistent theme preference in `localStorage`.

---

## 🚀 Quick Start

### Option 1: Zero-Dependency Node.js Server
```bash
# Clone the repository
git clone https://github.com/HosakSK/hosak-virtual-flight-finder.git
cd hosak-virtual-flight-finder

# Start server
npm start
# or
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Option 2: Static Hosting (Vercel, Netlify, GitHub Pages)
The application runs as a modern, lightweight static app with built-in Vercel serverless API handlers in `api/`.

---

## 🔄 Data Pipeline & Scripts

```bash
# Install Python scraper dependencies
pip install -r scripts/requirements.txt

# Update Ryanair schedules from API
npm run update:flights

# Update active callsigns from FlightRadar24
npm run update:callsigns
```

---

## 📁 Project Structure

```
hosak-virtual-flight-finder/
├── index.html                   # Main UI entry point with Airline & Aircraft filters
├── style.css                    # Aviation glassmorphism design system & airline themes
├── main.js                      # Application logic, filters, modal, weather & VATSIM APIs
├── flights.json                 # Complete multi-airline flight dataset (1,400+ flights)
├── ryanair_flights_lzib.json    # Backwards-compatible flight data link
├── favicon.svg                  # Favicon
├── icons.svg                    # SVG icon sprite
├── server.js                    # Lightweight Node.js server & API proxy
├── package.json                 # Project configuration & npm scripts
├── vercel.json                  # Vercel deployment configuration
├── api/                         # Vercel serverless API proxy endpoints
│   ├── metar.js                 # AviationWeather METAR proxy
│   ├── taf.js                   # AviationWeather TAF proxy
│   └── flight-route.js          # Flight Plan Database route proxy
├── scripts/
│   ├── build_multi_airline_dataset.js  # Multi-airline dataset generator
│   ├── update_flights.py        # Ryanair API schedule scraper
│   ├── fix_homebase.py          # Turnaround homebase correction algorithm
│   ├── update_callsigns.py      # Real-time FlightRadar24 callsign updater
│   └── requirements.txt         # Python dependencies
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
