import os, json
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator, model_validator
from dotenv import load_dotenv; load_dotenv()

# Load NOMINATIM_UA from .env (or use default if not set)
NOMINATIM_UA = os.getenv("NOMINATIM_UA", "trip-buddy/0.1 (contact: nair.gauthamvm@gmail.com)")

from langchain_google_genai import ChatGoogleGenerativeAI

#Input schema validation
class TripRequest(BaseModel):
    startLocation: str
    endLocation: Optional[str] = Field(None, description="Preferred End location of the trip (if any)")
    transportMode: List[str]
    startTime: datetime
    tripDuration: Optional[str] = Field(None, description="Target total time window in hours as string, e.g., '7'")
    wheelchairAccessible: bool = Field(False, description="Whether the user needs wheelchair accessible routes")
    cuisines: Optional[str] = Field(None, description="Cuisine preferences(if any)")
    dietPreferences: Optional[str] = Field(None, description="Dietary restrictions(if any)")
    activityPreferences: Optional[str] = Field(None, description="Eg: Sightseeing, Restaurants, Parks, Shopping Preferences (if any)")
    budgetPreferences: Optional[str] = Field(None, description="Budget range (if any)")

    @field_validator("transportMode")
    @classmethod
    def normalize_modes(cls, v: List[str]):
        allowed = {"subways", "walk"}
        bad = [m for m in v if m not in allowed]
        if bad:
            raise ValueError(f"Mode not supported as of now: {bad}. Allowed: {sorted(allowed)}")
        return v

    @model_validator(mode="after")
    def check_time_window(self):
        """Derive endTime = startTime + tripDuration (capped to 24h)."""
        import re
        if not self.startTime:
            raise ValueError("startTime is required")

        # Parse tripDuration like "7", "7h", "5 hours", "1 day"
        max_h = 24
        hours = max_h
        if self.tripDuration:
            m = re.search(r"(\d+(\.\d+)?)\s*(d(ay)?s?|h(our)?s?)?$",
                        str(self.tripDuration).strip().lower())
            if m:
                val = float(m.group(1))
                unit = (m.group(3) or "h").lower()
                hours = int(round(val * (24 if unit.startswith("d") else 1)))

        hours = max(1, min(hours, max_h))
        object.__setattr__(self, "endTime", self.startTime + timedelta(hours=hours))
        return self

# Output schema for base plan
class Leg(BaseModel):
    sequence: int
    mode: str
    departTime: Optional[str] = None  # ISO8601 local or relative e.g. "17:58"
    arriveTime: Optional[str] = None
    fromLocation: str
    # fromLat: str
    toLocation: str
    # toLat: str
    estDurationMin: Optional[int] = None
    accessibilityNotes: Optional[str] = None
    costEstimateUSD: Optional[float] = None
    choiceReasoning: Optional[str] = None

class Itinerary(BaseModel):
    summary: str
    totalEstDurationMin: Optional[int] = None
    totalEstCostUSD: Optional[float] = None
    assumptions: List[str]
    legs: List[Leg]

# Gemini LLM setup
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY not FOUND.")

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
structured_llm = llm.with_structured_output(Itinerary)

# Planner function
SYSTEM_INSTRUCTIONS = f"""You are a precise urban travel planner. Given a set of preferences, start and end location, your task is to suggest exact addresses and names of nearby attractions, or places to visit. Consider travel timings between attractions.
Constraints:
- Obey allowed transport modes only. Keep travel time realistic.
- Respect wheelchair accessibility(if any): prefer step-free routes, boarding ramps, elevators; avoid stairs where possible; note any potential barriers if value is 'true'.Assume default value to be 'false'. If true be considerate on walking times. 
- Stay within the user’s time window (startTime..endTime). Include buffer time between legs.
- Give high preference for user's Activity preferences(if any).
- Be sure not to violate any dietary restrictions if provided.
- Be conservative on timing; But maximize the hours for the best experience.
- Mention Restaurant names and aprroximate cost per person.DO NOT SUGGEST VAGUE PLACES.
- prefer subway if walking takes an unreasonable time.
- Mention proper modes: subway, walk, or activity if user has to spend time at a particular location.
- Provide choice reasoning such as budget, dietary, or activity preferences. Make sure to highlight if any constraint might be violated.
Output must VALIDATE against the provided JSON schema.
"""

def plan_trip(request_json: str) -> Itinerary:
    # 1) Validate input
    data = json.loads(request_json)
    trip = TripRequest(**data)

    # 2) Craft prompt
    user_prompt = f"""
User trip request (ISO times are local):
{trip.json()}

Task:
- Build an itinerary from startLocation to endLocation using ONLY these modes: {trip.transportMode}.
- Window: {trip.startTime} to {trip.endTime} (local). Target overall duration ~{trip.tripDuration} hours if provided.
- Wheelchair accessible: {trip.wheelchairAccessible}.
- Choice of cuising (if any): {trip.cuisines}.
- Dietary Restrictions(if any): {trip.dietPreferences}.
- Activitiy Preference(if any): {trip.activityPreferences}.
- Budget constraints(if any): {trip.budgetPreferences}.
- Include very short notes in choice reasoning field regarding choice, or if any constraint may be violated.
- Each leg should be realistic and sequential with full, proper and exact locations. Keep legs to maximum of 6 if possible.
- Make sure to add each and every attractions, places to visit, restaurants etc as locations, while obeying the detailed constaraints. 
- Recheck everything to make sure cost and time constraints anre considered and outputted in the JSON.
"""

    # 3) Invoke LLM for structured JSON
    itinerary: Itinerary = structured_llm.invoke(
        [
            {"role": "system", "content": SYSTEM_INSTRUCTIONS},
            {"role": "user", "content": user_prompt},
        ]
    )
    return itinerary

# Optimizer node: schema
class OptimizationSignals(BaseModel):
    """Flexible input for constraints/news/weather/budget signals."""
    tripBudgetUSD: Optional[float] = None
    weather: Optional[dict] = None
    news: Optional[List[dict]] = None
    restrictions: Optional[List[str]] = None
    notes: Optional[List[str]] = None

class ChangeItem(BaseModel):
    change_type: Literal["add","remove","extend","shorten","move","replace"]
    target_sequence: Optional[int] = None     # original sequence being changed (if applicable)
    new_sequence: Optional[int] = None        # where it ends up (if applicable)
    before: Optional[Leg] = None              # snapshot of the affected leg (pre-change)
    after: Optional[Leg] = None               # the updated/new leg (post-change)
    reason: str                               # short rationale
    expected_time_delta_min: Optional[int] = None
    expected_budget_delta_usd: Optional[float] = None
    risk_notes: Optional[str] = None          # e.g., "wheelchair uncertain; verify elevator"

class OptimizationResult(BaseModel):
    summary: str
    changes: List[ChangeItem]
    optimized: Itinerary                    # full, updated itinerary
    assumptions: List[str]                  # conservative assumptions the LLM made
    budget_summary: Optional[str] = None    # total now, and how it compares to budget
    notes: List[str] = []                   # misc. reminders for the next node

# Weather sidecar overlay
import requests
from dateutil import parser as _dtparse
from datetime import datetime, timedelta

OWM_FORECAST_URL  = "https://api.openweathermap.org/data/2.5/forecast"
WEATHER_API_KEY   = os.getenv("WEATHER_API_KEY")

# simple caches
_WEATHER_Q_CACHE: dict[str, list | None] = {}

_COUNTRY_MAP = {
    "USA": "US", "UNITED STATES": "US", "US": "US",
    # add more if you need: "United Kingdom":"GB", "UK":"GB", "Canada":"CA", ...
}

def _coerce_dt(s: Optional[str], base: datetime) -> Optional[datetime]:
    if not s: return None
    try:
        dt = _dtparse.parse(s)
        # If just "HH:MM", attach base date
        if len(s.strip()) <= 8:
            dt = dt.replace(year=base.year, month=base.month, day=base.day)
        return dt
    except Exception:
        return None

def _extract_city_q(place: str) -> str:
    """
    Convert a full postal address into a 'q' string suitable for OpenWeather.
    Heuristic: choose the nearest plausible city token + optional country code.
    Examples:
      "Times Square, New York, NY 10036, USA" -> "New York,US"
      "Queens Museum, Queens, NY, USA"        -> "Queens,US"
    """
    if not place:
        return ""

    tokens = [t.strip() for t in place.split(",") if t.strip()]
    # country code (best-effort)
    country_code = None
    for t in reversed(tokens):
        up = t.upper()
        if up in _COUNTRY_MAP:
            country_code = _COUNTRY_MAP[up]
            break

    def is_state_or_zip(tok: str) -> bool:
        if any(ch.isdigit() for ch in tok):  # contains zip
            return True
        if len(tok) <= 3 and tok.isupper():  # "NY", "NJ"
            return True
        return False

    # find a token that looks like a city (skip venue line, state/zip/country)
    city = None
    for t in reversed(tokens):
        up = t.upper()
        if up in _COUNTRY_MAP:        # country token
            continue
        if is_state_or_zip(t):
            continue
        # skip obvious venue line if there are >2 tokens and this is the first one
        if t == tokens[0] and len(tokens) > 2:
            continue
        city = t
        break

    if city is None:
        city = tokens[-1] if tokens else place

    return f"{city},{country_code}" if country_code else city

def _owm_forecast_blocks_by_place(place: str) -> Optional[list]:
    """
    Fetch 5-day/3-hour forecast blocks using 'q' only (no geocoding).
    """
    if not WEATHER_API_KEY or not place:
        return None
    q = _extract_city_q(place)
    if not q:
        return None

    key = q.lower()
    if key in _WEATHER_Q_CACHE:
        return _WEATHER_Q_CACHE[key]

    try:
        r = requests.get(
            OWM_FORECAST_URL,
            params={"q": q, "appid": WEATHER_API_KEY, "units": "metric"},
            timeout=20,
        )
        if r.status_code != 200:
            _WEATHER_Q_CACHE[key] = None
            return None
        blocks = r.json().get("list", [])
        _WEATHER_Q_CACHE[key] = blocks
        return blocks
    except Exception:
        _WEATHER_Q_CACHE[key] = None
        return None

def _pick_closest(blocks: list, target: datetime) -> Optional[dict]:
    if not blocks or not target:
        return None
    # OWM dt is seconds since epoch (UTC). Good enough for 3-hour bins.
    return min(blocks, key=lambda b: abs(datetime.fromtimestamp(b["dt"]) - target))

def _fmt(block: dict) -> dict:
    w = (block.get("weather") or [{}])[0]
    m = block.get("main") or {}
    wind = block.get("wind") or {}
    return {
        "time": datetime.fromtimestamp(block["dt"]).isoformat(),
        "temp_c": m.get("temp"),
        "condition": (w.get("description") or "").title(),
        "humidity_pct": m.get("humidity"),
        "wind_mps": wind.get("speed"),
        "icon": w.get("icon"),
        "source": "openweathermap:q"
    }

def _ensure_leg_times(req: TripRequest, itin: Itinerary) -> list[tuple[Leg, datetime, datetime]]:
    """
    Guarantee each leg has a depart/arrive dt (even if Node 1 omitted times):
    evenly slice the trip window as a fallback.
    """
    start = req.startTime
    end   = req.endTime
    legs  = itin.legs or []
    n     = max(1, len(legs))
    slot  = (end - start) / n

    resolved = []
    for idx, leg in enumerate(legs):
        dep = _coerce_dt(leg.departTime, start)
        arr = _coerce_dt(leg.arriveTime, start)
        if dep is None and arr is None:
            dep = start + slot * idx
            arr = start + slot * (idx + 1)
        elif dep is not None and arr is None:
            arr = min(dep + slot, end)
        elif dep is None and arr is not None:
            dep = max(arr - slot, start)
        # clamp inside window
        if dep < start: dep = start
        if arr > end:   arr = end
        if arr <= dep:  arr = dep + timedelta(minutes=30)
        resolved.append((leg, dep, arr))
    return resolved

def build_weather_overlay_by_place(trip_request_json: str, itin: Itinerary) -> dict:
    """
    Sidecar overlay (does NOT modify itinerary):
    {
      "legWeather": [
        {
          "sequence": 1,
          "fromLocation": "...",
          "toLocation": "...",
          "departTime": "...",
          "arriveTime": "...",
          "departWeather": {...} | null,
          "arriveWeather": {...} | null
        }
      ]
    }
    """
    if not WEATHER_API_KEY:
        return {"legWeather": [], "note": "No WEATHER_API_KEY; overlay skipped."}

    req = TripRequest(**json.loads(trip_request_json))
    resolved = _ensure_leg_times(req, itin)

    out = {"legWeather": []}
    for leg, dep_dt, arr_dt in resolved:
        blocks_from = _owm_forecast_blocks_by_place(leg.fromLocation)
        blocks_to   = _owm_forecast_blocks_by_place(leg.toLocation)

        depart = _fmt(_pick_closest(blocks_from, dep_dt)) if blocks_from else None
        arrive = _fmt(_pick_closest(blocks_to,   arr_dt)) if blocks_to   else None

        out["legWeather"].append({
            "sequence": leg.sequence,
            "fromLocation": leg.fromLocation,
            "toLocation": leg.toLocation,
            "departTime": dep_dt.isoformat(),
            "arriveTime": arr_dt.isoformat(),
            "departWeather": depart,
            "arriveWeather": arrive,
        })
    return out

###############################################################################
# ===== Minimal context helpers for optimizer =====
from typing import Tuple

def _strip_itinerary_for_optimizer(itin: Itinerary, keep_fields: List[str]) -> List[dict]:
    """Return legs as a list of dicts containing only the fields the LLM must preserve/edit."""
    slim = []
    for leg in itin.legs or []:
        d = {}
        for k in keep_fields:
            d[k] = getattr(leg, k, None)
        slim.append(d)
    return slim

def _is_bad_weather(blob: Optional[dict]) -> bool:
    """Simple heuristic: treat rain/snow/thunder/drizzle/sleet/hail or high winds as 'bad'."""
    if not blob:
        return False
    cond = (blob.get("condition") or "").lower()
    icon = (blob.get("icon") or "")
    wind = float(blob.get("wind_mps") or 0)
    bad_kw = ("rain", "snow", "thunder", "storm", "drizzle", "sleet", "hail")
    if any(k in cond for k in bad_kw):
        return True
    if str(icon).startswith(("09", "10", "11", "13")):  # OWM precip/thunder/snow family
        return True
    if wind >= 12:  # ~27 mph
        return True
    return False

def _summarize_weather_risk_from_overlay(overlay: Optional[dict]) -> Tuple[bool, List[dict]]:
    """Compress the weather overlay to per-leg risk rows the LLM can actually use."""
    if not overlay:
        return False, []
    risks = []
    any_bad = False
    for lw in overlay.get("legWeather", []):
        dbad = _is_bad_weather(lw.get("departWeather"))
        abad = _is_bad_weather(lw.get("arriveWeather"))
        any_bad = any_bad or dbad or abad
        risks.append({
            "sequence": lw.get("sequence"),
            "departTime": lw.get("departTime"),
            "arriveTime": lw.get("arriveTime"),
            "departCondition": (lw.get("departWeather") or {}).get("condition"),
            "arriveCondition": (lw.get("arriveWeather") or {}).get("condition"),
            "departBad": dbad,
            "arriveBad": abad,
        })
    return any_bad, risks

OPTIMIZER_SYSTEM = """You are a conservative itinerary optimizer.

SCOPE:
- Consider ONLY the fields provided in the user message.
- Do NOT infer from missing fields (old summaries/assumptions intentionally omitted).
- Allowed transport: exactly the provided list. No taxis/rideshare.
- Keep within start..end window; keep legs ≤ 6; keep sequence logical and times chronological.
- Wheelchair='true': avoid stairs; reduce long walks in bad weather; prefer step-free options.

WEATHER POLICY:
- If no leg is weather-bad, or no new budget constraints or no new user preference notes, RETURN THE ORIGINAL SEQUENCE AND TIMES (copy of provided legs).
- If a leg has bad weather at depart/arrive:
  • Prefer SUBWAY over long WALK in rain/snow/high winds.
  • Shift times slightly (≤ 45 min) to avoid worst windows when feasible.
  • Replace outdoor activities with nearby indoor alternatives; shorten outdoor dwell times if mild precip.
  • Minimize deviation from original plan.
- If a leg does not fit into budget constraints:
  • Remove, or replace with new leg with a new estimated cost.
- If a leg does not fit into user preference notes:
  • Give high priority to preferences in the note.
  • Minimize deviation from the overall plan, by looking for nearby attractions, that fit the plan

OUTPUT:
- Produce an OptimizationResult:
  • changes[]: list the diffs you made (or empty if none).
  • optimized: FULL Itinerary JSON (same schema).
  • assumptions: add a short weather note if any edits occurred; else you can keep it minimal.
- Keep 'choiceReasoning' short (≤ 15 words) when a leg is changed for weather/budget/preference reasons.
"""

def optimize_itinerary(
    trip_request_json: str,
    current_itinerary_json: str,
    signals_json: str
) -> OptimizationResult:
    """Optimize using ONLY minimal retained fields + new preferences/notes + weather overlay."""
    opt_llm_struct = llm.with_structured_output(OptimizationResult)
    # Parse + validate inputs
    req_data = json.loads(trip_request_json)
    trip = TripRequest(**req_data)

    cur_data = json.loads(current_itinerary_json)
    current_itin = Itinerary(**cur_data)

    sig_data = json.loads(signals_json) if signals_json else {}
    # signals.weather is expected to be the overlay dict you built earlier
    weather_overlay = sig_data.get("weather")
    new_notes = sig_data.get("user_notes") or []    # new prefs/notes only
    new_budget = sig_data.get("tripBudgetUSD", None)

    # Slim the current itinerary to just the essential, non-conflicting fields
    KEEP_LEG_FIELDS = [
        "sequence", "mode",
        "departTime", "arriveTime",
        "fromLocation", "toLocation",
        "estDurationMin", "costEstimateUSD", "accessibilityNotes", "choiceReasoning"
    ]
    slim_legs = _strip_itinerary_for_optimizer(current_itin, KEEP_LEG_FIELDS)

    # Compress weather to leg-level risk flags
    any_bad, weather_risks = _summarize_weather_risk_from_overlay(weather_overlay)

    # If neither weather risk nor new notes/budget, short-circuit: no changes
    if not any_bad and not new_notes and new_budget is None:
        # Return a no-op result
        no_changes = OptimizationResult(
            summary="No weather risks or new preferences. Itinerary unchanged.",
            changes=[],
            optimized=current_itin,
            assumptions=(current_itin.assumptions or []) + ["No new signals; kept as-is."],
            budget_summary=None,
            notes=[]
        )
        return no_changes

    # Build minimal LLM context
    context = {
        "trip_window": {"start": trip.startTime.isoformat(), "end": getattr(trip, "endTime").isoformat()},
        "allowedModes": trip.transportMode,               # e.g., ["subways","walk"]
        "wheelchairAccessible": trip.wheelchairAccessible,
        "new_preferences": {
            "notes": new_notes,
            "budgetUSD": new_budget
        },
        "weather_risks": weather_risks,
        "current_legs": slim_legs
    }

    user_msg = (
        "Optimize ONLY if weather_risks indicate problems, or if new_preferences require a tweak.\n"
        "Otherwise, return the provided current_legs unchanged (resequence 1..N if needed).\n"
        "Return an OptimizationResult JSON.\n\n"
        + json.dumps(context, default=str)
    )

    result: OptimizationResult = opt_llm_struct.invoke(
        [
            {"role": "system", "content": OPTIMIZER_SYSTEM},
            {"role": "user", "content": user_msg}
        ]
    )

    if result.optimized.legs:
        # result.optimized.legs = result.optimized.legs[:6]
        for idx, leg in enumerate(result.optimized.legs, start=1):
            leg.sequence = idx

    return result



##################################################################################

# Create a structured wrapper for optimizer output
#opt_llm_struct = llm.with_structured_output(OptimizationResult)

# ===================== CRIME OVERLAY (NYC Open Data) ===================== #

import os, time, math, requests
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from dateutil import parser as _dtp

NYC_CRIME_BASE   = "https://data.cityofnewyork.us/resource"
NYC_CRIME_DATASET = "5uac-w243"  # NYPD Complaint Data (Historic) - robust, but slightly laggy

# ---- Geocoding (Nominatim) ----
## NOMINATIM_UA is now loaded at the top after load_dotenv
_GEOCODE_CACHE: dict[str, Optional[Tuple[float, float]]] = {}

def _geocode_nominatim(address: str, timeout=20) -> Optional[Tuple[float, float]]:
    if not address: 
        return None
    key = address.strip().lower()
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": NOMINATIM_UA},
            timeout=timeout,
        )
        r.raise_for_status()
        js = r.json()
        if not js:
            _GEOCODE_CACHE[key] = None
            return None
        lat, lon = float(js[0]["lat"]), float(js[0]["lon"])
        _GEOCODE_CACHE[key] = (lat, lon)
        time.sleep(1.0)  # be polite to Nominatim
        return (lat, lon)
    except Exception:
        _GEOCODE_CACHE[key] = None
        return None

# ---- SODA helpers ----
def _headers():
    h = {}
    return h

def _date_only(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")

def _deg_bbox(lat: float, lon: float, radius_m: int) -> Tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lon, max_lon) for a circle radius_m around lat/lon."""
    # ~111,320 m per deg latitude
    dlat = radius_m / 111320.0
    # longitude degrees shrink by cos(lat)
    dlon = radius_m / (111320.0 * max(0.1, math.cos(math.radians(lat))))
    return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)

def _crime_count(where: str, timeout=25) -> Optional[int]:
    """Return count for where-clause (bbox/date only)."""
    try:
        r = requests.get(
            f"{NYC_CRIME_BASE}/{NYC_CRIME_DATASET}.json",
            params={"$select": "count(1)", "$where": where},
            headers=_headers(),
            timeout=timeout,
        )
        r.raise_for_status()
        js = r.json()
        if js and isinstance(js, list) and "count_1" in js[0]:
            return int(js[0]["count_1"])
        return None
    except Exception:
        return None

def _crime_top_offenses(where: str, limit=5, timeout=30) -> List[dict]:
    """
    Top offense descriptions near the point/window.
    Uses COALESCE to bucket nulls.
    """
    try:
        r = requests.get(
            f"{NYC_CRIME_BASE}/{NYC_CRIME_DATASET}.json",
            params={
                "$select": "COALESCE(ofns_desc,'Unknown') as offense, count(1) as c",
                "$where": where,
                "$group": "offense",
                "$order": "c DESC",
                "$limit": limit,
            },
            headers=_headers(),
            timeout=timeout,
        )
        r.raise_for_status()
        rows = r.json() or []
        out = []
        for row in rows:
            try:
                out.append({"offense": row.get("offense", "Unknown"), "count": int(row.get("c", 0))})
            except Exception:
                pass
        return out
    except Exception:
        return []

def _where_bbox(lat: float, lon: float, radius_m: int, start: datetime, end: datetime) -> str:
    """
    BBox filter (works even if dataset lacks a 'location' type column).
    Only rows with geocoded latitude/longitude are considered.
    """
    min_lat, max_lat, min_lon, max_lon = _deg_bbox(lat, lon, radius_m)
    # cmplnt_fr_dt is a date; cast boundaries conservatively
    start_str = _date_only(start)
    end_str   = _date_only(end)
    return (
        f"cmplnt_fr_dt BETWEEN '{start_str}' AND '{end_str}' "
        f"AND latitude IS NOT NULL AND longitude IS NOT NULL "
        f"AND latitude >= {min_lat} AND latitude <= {max_lat} "
        f"AND longitude >= {min_lon} AND longitude <= {max_lon}"
    )

def _crime_stats_for_point(
    lat: float, lon: float,
    start: datetime, end: datetime,
    radius_seq: Tuple[int, ...] = (400, 800, 1200),
) -> dict:
    """
    Try increasing radii until we find results. Returns compact stats (no samples).
    """
    for radius_m in radius_seq:
        where_bbox = _where_bbox(lat, lon, radius_m, start, end)
        cnt = _crime_count(where_bbox)
        if cnt is not None and cnt > 0:
            return {
                "count": cnt,
                "window": f"{_date_only(start)}..{_date_only(end)}",
                "radius_m": radius_m,
                "top_offenses": _crime_top_offenses(where_bbox),
                "source": f"NYC Open Data NYPD {NYC_CRIME_DATASET}",
            }

    # No hits at any radius -> return explicit zero
    return {
        "count": 0,
        "window": f"{_date_only(start)}..{_date_only(end)}",
        "radius_m": radius_seq[-1] if radius_seq else None,
        "top_offenses": [],
        "source": f"NYC Open Data NYPD {NYC_CRIME_DATASET}",
        "note": "No geocoded matches for this window/radius; dataset may lag or coords missing.",
    }

def _adaptive_stats_for_place(
    place: str,
    base_start: datetime, base_end: datetime,
    radius_seq: Tuple[int, ...] = (400, 800, 1200),
    lookbacks: Tuple[int, ...] = (45, 180, 365),  # widen window progressively (days)
) -> dict:
    """
    Geocode place, then try multiple (lookback, radius) combos until we get data.
    """
    geo = _geocode_nominatim(place)
    if not geo:
        return {
            "count": None,
            "window": f"{_date_only(base_start)}..{_date_only(base_end)}",
            "radius_m": radius_seq[-1],
            "top_offenses": [],
            "source": f"NYC Open Data NYPD {NYC_CRIME_DATASET}",
            "note": "Geocoding failed; cannot compute nearby stats.",
        }
    lat, lon = geo

    # try from tightest to widest window
    for days in lookbacks:
        start = base_end - timedelta(days=days)
        end   = base_end
        stats = _crime_stats_for_point(lat, lon, start, end, radius_seq)
        if stats.get("count") and stats["count"] > 0:
            return stats

    # Nothing even with widest window -> return last attempt with count (0/None) as-is
    return _crime_stats_for_point(lat, lon, base_end - timedelta(days=lookbacks[-1]), base_end, radius_seq)

def build_crime_overlay_by_place(
    trip_request_json: str,
    itin,  # Itinerary Pydantic object from your code
    *,
    lookback_days_default: int = 45,
    widen_steps: Tuple[int, ...] = (45, 180, 365),
    radius_seq: Tuple[int, ...] = (400, 800, 1200),
) -> dict:
    """
    Returns a sidecar overlay—does NOT mutate your itinerary.
    {
      "legCrime": [
        {
          "sequence": 1,
          "fromLocation": "...",
          "toLocation": "...",
          "fromCrime": { "count": 12, "window": "2025-06-20..2025-10-04",
                         "radius_m": 800, "top_offenses": [{"offense":"Larceny","count":7},...],
                         "source": "NYC Open Data NYPD 5uac-w243" },
          "toCrime":   { ... } or null
        },
        ...
      ],
      "params": { "lookback_days_default": 45, "radius_seq": [400,800,1200] }
    }
    """
    # Pull trip window from request to anchor “end” of the analysis
    req = TripRequest(**json.loads(trip_request_json))
    base_start = req.startTime
    base_end   = getattr(req, "endTime")

    out = {"legCrime": [], "params": {"lookback_days_default": lookback_days_default,
                                      "widen_steps": list(widen_steps),
                                      "radius_seq": list(radius_seq)}}

    for leg in (itin.legs or []):
        from_stats = _adaptive_stats_for_place(
            leg.fromLocation, base_start, base_end,
            radius_seq=radius_seq, lookbacks=widen_steps
        ) if leg.fromLocation else None

        to_stats = _adaptive_stats_for_place(
            leg.toLocation, base_start, base_end,
            radius_seq=radius_seq, lookbacks=widen_steps
        ) if leg.toLocation else None

        out["legCrime"].append({
            "sequence": leg.sequence,
            "fromLocation": leg.fromLocation,
            "toLocation": leg.toLocation,
            "fromCrime": from_stats,
            "toCrime": to_stats,
        })

    return out


