from flask import Flask, request, jsonify
from flask_cors import CORS
from event_planner import plan_trip, build_weather_overlay_by_place
import json
from stream_tts import tts_app



app = Flask(__name__)
CORS(app)

# ---- Main itinerary endpoint ----
@app.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    data = request.json

    # Plan trip and build weather overlay
    base_plan = plan_trip(json.dumps(data))
    weather_overlay = build_weather_overlay_by_place(json.dumps(data), base_plan)

    return {
        "base_plan": base_plan.model_dump(),  # send the JSON representation
        "weather_overlay": weather_overlay
    }, 200

# ---- Register TTS blueprint ----
app.register_blueprint(tts_app, url_prefix='/tts')

if __name__ == '__main__':
    app.run(debug=True)
