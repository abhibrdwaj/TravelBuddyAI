<<<<<<< Updated upstream
from flask import Flask, request, jsonify
from flask_cors import CORS
from event_planner import plan_trip, build_weather_overlay_by_place
import json
import pdb
=======
from flask import Flask, request, jsonify, send_file
from stream_tts import generate_itinerary_script, stream_itinerary_tts
from stream_tts import app as tts_app
>>>>>>> Stashed changes

app = Flask(__name__)
CORS(app)

@app.route('/api/itinerary', methods=['POST'])
def create_itinerary():
    data = request.json

    base_plan = plan_trip(json.dumps(data))

    weather_overlay = build_weather_overlay_by_place(json.dumps(data), base_plan)

    return {"base_plan": base_plan.model_dump(), "weather_overlay": weather_overlay}, 200

app.register_blueprint(tts_app, url_prefix='/tts')

if __name__ == '__main__':
    app.run(debug=True)