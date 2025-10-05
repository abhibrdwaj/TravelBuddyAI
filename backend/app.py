from flask import Flask, request, jsonify
from flask_cors import CORS
from event_planner import plan_trip, build_weather_overlay_by_place
import json
import pdb

app = Flask(__name__)
CORS(app)

@app.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    data = request.json

    base_plan = plan_trip(json.dumps(data))

    weather_overlay = build_weather_overlay_by_place(json.dumps(data), base_plan)

    return {"base_plan": base_plan.model_dump(), "weather_overlay": weather_overlay}, 200

if __name__ == '__main__':
    app.run(debug=True)