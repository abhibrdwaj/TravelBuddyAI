# Voyalytics.ai — LLM Trip Planner with Weather & Crime Overlays

A small, fast, **LLM‑assisted trip planner for New York City**.  
It builds a base itinerary with **Gemini**,  **LangChain**, adds **weather** and **nearby crime** information, and can **optimize** the plan when conditions suggest tweaks such as user preference, and weather.

---

## Project Structure

```
TravelBuddyAI
├── backend
│   ├── app.py
│   ├── requirements.txt
│   └── README.md
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── App.js
│   │   ├── components
│   │   │   └── InputPage.js
│   │   └── styles
│   │       └── InputPage.css
│   ├── package.json
│   └── README.md
└── README.md
```

## Getting Started

### Backend Setup

1. Navigate to the `backend` directory.
2. Install the required dependencies using pip:
   ```
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install the required dependencies using npm:
   ```
   npm install
   ```
3. Start the React application:
   ```
   NODE_OPTIONS=--openssl-legacy-provider npm start
   ```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## ✨ Features

- **Node 1 — Planner (LLM)**
  - Structured itinerary via **Gemini 2.5 Flash**.
  - Respects: time window (auto‑capped at 24h), allowed modes (`subways`, `walk`), wheelchair flag, cuisine/diet/activity/budget prefs.
  - Produces **exact place names & addresses** (no vague “some café”).

- **Weather overlay**  
  - Uses **OpenWeatherMap 5‑day / 3‑hour forecast** by **place name** (no geocoding call).  
  - For each leg, attaches the closest forecast block for **depart** and **arrive** timestamps.  
  - **Does not** modify the itinerary; returned as `weatherOverlay.legWeather[]`.

- **Crime overlay**  
  - Uses **NYC Open Data – NYPD Complaint Data (`5uac-w243`)**.  
  - Geocodes locations with **Nominatim** (polite: 1 req/sec, cached).  
  - Queries by **bounding box** & **date window**, with **adaptive widening** (lookback & radius) to surface useful counts.  
  - Returns compact stats: `count`, `window`, `radius_m`, `top_offenses[]`, `source`. (No heavy samples by default.)  
  - **Does not** modify the itinerary.

- **Node 2 — Optimizer (LLM - Gemini)**  
  - Minimal context “rechecker” that considers **weather risks**, **new budget**, and **new notes** only.  
  - Keeps the plan unchanged if no signals; otherwise performs **small, local edits** (shift ≤45 min, prefer subway in rain, swap outdoor→indoor, etc.) and returns diffs + a new itinerary.

- **Sane caps & defaults**  
  - Derives `endTime = startTime + tripDuration` with a hard max of **24 hours**.  
  - Fallback timing if Node 1 omitted leg times (even slicing across the window).  
  - Clear validation errors and helpful messages.

## 🔧 Setup

### 1) Python & virtual env
- **Python 3.10+** recommended.

**Windows (PowerShell):**
```powershell
py -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Environment variables (`.env`)
Create a `.env` file in the repo root:

```
# Gemini via LangChain (required)
GOOGLE_API_KEY=your_gemini_api_key

# Weather overlay (required to enable weather sidecar)
WEATHER_API_KEY=your_openweathermap_api_key

# NYC Open Data (optional but recommended for higher rate limits)
NYC_APP_TOKEN=your_socrata_app_token

# Nominatim (required per their policy; include a real contact)
NOMINATIM_UA=trip-buddy/0.1 (contact: youremail@example.com)
```

> If you omit `WEATHER_API_KEY` or `NYC_APP_TOKEN`, those sidecars may be skipped or rate‑limited; the planner still works.

### 3) Dependencies (`requirements.txt`)

---

### 4) Frontent interface - Available under frontend folder.
Add Google Maps API key to the .env

## 🧠 How it works

1. **Validate & normalize** (`TripRequest`)  
   - Allowed modes: `subways`, `walk` (easily extendable).  
   - `endTime` derived from `tripDuration` with a hard 24h cap.

2. **LLM plan (Node 1)**  
   - Gemini produces a strict JSON itinerary (2–6 legs), realistic timings/costs, short reasoning, and respects accessibility + preferences.

3. **Weather sidecar**  
   - For each leg, determine depart/arrive times (fallback slicing if missing).  
   - Query OpenWeatherMap by **place name** (`q=` heuristic) and select the closest 3‑hour forecast block for each timestamp.  
   - Returned in `weatherOverlay.legWeather[]`; **does not change** the itinerary.

4. **Crime sidecar**  
   - Geocodes each location via Nominatim (cached; 1 req/sec).  
   - Queries NYC SODA (`5uac-w243`) by bounding box and date window; if sparse, **widens** lookback and radius to surface meaningful counts.  
   - Returns compact counts & top offense labels. **Does not change** the itinerary.

5. **Optimizer (Node 2)**  
   - Consumes **only minimal, non‑conflicting fields** from the itinerary + **weather risks** + optional **notes/budget**.  
   - If nothing concerning, returns the plan unchanged.  
   - Otherwise, small local edits with clear `changes[]` diffs and a new `optimized` itinerary.

---

## 📝 Example request (Node 1)

```json
{
  "startLocation": "Times Square, New York, NY 10036, USA",
  "endLocation": "",
  "transportMode": ["subways", "walk"],
  "startTime": "2025-10-04T08:08",
  "tripDuration": "10",
  "wheelchairAccessible": "false",
  "cuisines": "Italian, Chinese",
  "dietPreferences": "Vegeterian",
  "activityPreferences": "Sightseeing, Restaurants, Parks, Shopping",
  "budgetPreferences": "$50-100"
}
```

---

## ⚠️ Limitations

- **LLM knowledge**: Planner does not scrape live sites; verify specific venues and events.  
- **OpenWeatherMap**: 3‑hour granularity; city‑level `q` can be coarse.  
- **NYPD dataset lag**: Recent incidents may not appear; some records lack coordinates; zero counts are possible even in busy areas. The overlay widens the search to help.  
- **Nominatim**: Respect usage policy & rate limits; provide a real `NOMINATIM_UA`.  
- **Accessibility**: Heuristic; verify station/venue step‑free access where it matters.

---

## 🔌 Extending

- Add **MTA GTFS/RT** for schedules & step‑free routing.  
- Swap weather provider for finer granularity (e.g., **NWS**, **Tomorrow.io**).  
- Feed **crime overlay** into the optimizer to avoid late‑night outdoor legs in higher‑count zones.  
- Persist itineraries and collect feedback to refine prompts.

---

## ❓ Troubleshooting

- **`GOOGLE_API_KEY not FOUND`**: Add to `.env`, re‑`activate` your venv.  
- **Weather fields are `null`**: Ensure `WEATHER_API_KEY` is set; some addresses may confuse the city extractor — try a simpler place name.  
- **Crime counts are all zero**: The dataset may be sparse for your window; the overlay widens lookback & radius automatically. Add `NYC_APP_TOKEN` to mitigate throttling.  
- **Nominatim 429**: Too many requests; the code sleeps 1s per request and caches, but avoid hammering and include a real contact in `NOMINATIM_UA`.

---

## 📜 Attribution

- **Gemini** via `langchain-google-genai`  
- **OpenWeatherMap** 5‑day/3‑hour forecast  
- **NYC Open Data** — NYPD Complaint Data (`5uac-w243`)  
- **Nominatim / OpenStreetMap**
- **11Labs** - For Text-to-speech capabilities
