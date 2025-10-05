from flask import Flask, request, jsonify
from flask_cors import CORS
from event_planner import ( plan_trip, build_weather_overlay_by_place,
                           optimize_itinerary, build_crime_overlay_by_place
                        )
import json
from stream_tts import tts_app


import pdb
import os

app = Flask(__name__)
CORS(app)

DATA_DIR = 'public'
os.makedirs(DATA_DIR, exist_ok=True)

@app.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    data = request.json

    # Also save latest
    with open(os.path.join(DATA_DIR, 'last_itinerary.json'), 'w') as f:
        json.dump(data, f)

    base_plan = plan_trip(json.dumps(data))
    weather_overlay = build_weather_overlay_by_place(json.dumps(data), base_plan)
    crime_overlay = build_crime_overlay_by_place(json.dumps(data), base_plan)

    return {"base_plan": base_plan.model_dump(),
            "weather_overlay": weather_overlay,
            "crime_overlay": crime_overlay}, 200

@app.route('/api/replan', methods=['POST'])
def replan_itinerary():
    data = request.json

    try:
        with open(os.path.join(DATA_DIR, 'last_itinerary.json'), 'r') as f:
            sample = json.load(f)

        # Expecting data = {"signal": {...}, "itinerary": {...}}
        signal = data.get('signal', {})
        itinerary = data.get('itinerary', {})

        print('Sample:', sample)

        optimized = optimize_itinerary(
            json.dumps(sample),
            json.dumps(itinerary.get('base_plan', {})),
            json.dumps(signal)
        )

        return jsonify({"base_plan": optimized.optimized.model_dump()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404


if __name__ == '__main__':
    app.run(debug=True)
