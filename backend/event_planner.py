import os, json
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator, model_validator
from dotenv import load_dotenv; load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI

#Input schema validation
class TripRequest(BaseModel):
    startLocation: str
    endLocation: Optional[str] = Field(None, description="Preferred End location of the trip (if any)")
    transportMode: List[str]
    startTime: datetime
    tripDuration: Optional[str] = Field(None, description="Target total time window in hours as string, e.g., '7'")
    wheelchairAccessible: bool = Field(False, description="Whether wheelchair accessibility is needed")
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
    toLocation: str
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

###############################################################################
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

# Create a structured wrapper for optimizer output
opt_llm_struct = llm.with_structured_output(OptimizationResult)

# Optimizer node: function
OPTIMIZER_SYSTEM = """You are an itinerary optimizer.
Goal: maximize time-on-experience within the allowed window and public-transport-only constraint,
respecting wheelchair needs, weather/news restrictions, budget, and additional user-preferences.

Rules:
- Keep the plan inside the user's window (startTime..endTime). Assume short transfer buffers.
- Public transport only (subway, bus, trains, ferries, walking, e-bikes). No taxis/rideshare.
- Wheelchair: prefer step-free, avoid stairs; if uncertain, say so briefly.
- Weather/news signals: avoid outdoor slots when 'outdoorUnfriendly' or closures are indicated; favor indoor alternatives.
- Budget: be conservative; prefer free/$ options when tight. Estimate deltas if you change the plan.
- Allowed change types: add, remove, extend, shorten, move, replace.
- Produce clear diffs (before/after) for any modified leg and a complete updated itinerary.
- Validate notes and preferences while finalizing replan. 
"""

def optimize_itinerary(
    trip_request_json: str,
    current_itinerary_json: str,
    signals_json: str
) -> OptimizationResult:
    """Optimize an itinerary given signals (weather/news/budget/preferences/etc.)."""

    # Parse + validate inputs
    req_data = json.loads(trip_request_json)
    trip = TripRequest(**req_data)  # gives us startTime, derived endTime, modes, wheelchair

    cur_data = json.loads(current_itinerary_json)
    current_itin = Itinerary(**cur_data)

    sig_data = json.loads(signals_json) if signals_json else {}
    signals = OptimizationSignals(**sig_data)

    # Build user prompt context
    context = {
        "trip_window": {"start": trip.startTime.isoformat(), "end": getattr(trip, "endTime").isoformat()},
        "transportMode": trip.transportMode,
        "wheelchairAccessible": trip.wheelchairAccessible,
        "tripBudgetUSD": signals.tripBudgetUSD,  # may be None
        "weather": signals.weather,
        "news": signals.news,
        "restrictions": signals.restrictions,
        "notes": signals.notes,
        "current_itinerary": current_itin.model_dump()
    }

    user_msg = (
        "Optimize this itinerary with the given signals and constraints.\n"
        "If removing a leg due to weather/closures, propose an indoor or nearby alternative when possible.\n"
        "Minimize dead time; avoid unnecessary long hops.\n"
        "Consider user preferences and dead time; avoid unnecessary long hops.\n"
        "Try to optimize using nearby places to initial iternary (if possible), but goal is to optimize as best as possible."
        "Return an OptimizationResult (schema enforced).\n\n"
        + json.dumps(context, default=str)
    )

    result: OptimizationResult = opt_llm_struct.invoke(
        [
            {"role": "system", "content": OPTIMIZER_SYSTEM},
            {"role": "user", "content": user_msg}
        ]
    )

    # Small safety: ensure optimized.legs have consistent sequence numbering (1..N)
    if result.optimized.legs:
        for idx, leg in enumerate(result.optimized.legs, start=1):
            leg.sequence = idx

    return result

# if __name__ == "__main__":
#     # 1) Build an initial plan
#     sample = {
#      "startLocation":"Times Square, New York, NY 10036, USA",
#      "endLocation":"",
#      "transportMode":["subways", "walk"],
#      "startTime":"2025-10-04T08:08",
#      "tripDuration":"10",
#      "wheelchairAccessible":"false",
#      "cuisines":"Italian, Chinese",
#      "dietPreferences":"Vegeterian",
#      "activityPreferences":"Sightseeing, Restaurants, Parks, Shopping",
#      "budgetPreferences": "$50-100"
#     }

    
#     print("Finding trips...")
#     base_plan = plan_trip(json.dumps(sample))
#     print(json.dumps(base_plan.model_dump()))

#     ################################
#     print("Pulling weather overlay (no schema changes to itinerary)...")
#     weather_overlay = build_weather_overlay_by_place(json.dumps(sample), base_plan)

#     print(json.dumps({
#         "itinerary": base_plan.model_dump(),       # unchanged Node1 output
#         "weatherOverlay": weather_overlay          # sidecar with weather per leg
#     }, indent=2, default=str))
    ################################

    # optimize_flag = False

    # step2_input = input("Do you want to optimize based on blah blah? Yes/ No")

    # if step2_input == "Yes":
    #     optimize_flag = True

    # if optimize_flag:
    #     # 2) Optimization signals: rainy evening + budget cap + news + user preferences
    #     signals = {
    #         "tripBudgetUSD": 50,
    #         "weather": {"summary":"Rain likely","precipProb":0.7,"outdoorUnfriendly": True},
    #         "news": [{"title":"Parade on 6th Ave","impact":"closures","areas":["Midtown"]}],
    #         "restrictions": ["avoid_outdoor_evening"],
    #         "notes": ["Prefer indoor museums/food halls over parks"]
    #     }

    #     print(f"Optimizing iternaries based on: {json.dumps(signals)}")

    #     optimized = optimize_itinerary(
    #         json.dumps(sample),
    #         json.dumps(base_plan.model_dump()),
    #         json.dumps(signals)
    #     )

    #     print("\n=== OPTIMIZATION CHANGES ===")
    #     print(json.dumps([c.model_dump() for c in optimized.changes], indent=2, default=str))
    #     print("\n=== OPTIMIZED ITINERARY ===")
    #     print(json.dumps(optimized.optimized.model_dump(), indent=2, default=str))


