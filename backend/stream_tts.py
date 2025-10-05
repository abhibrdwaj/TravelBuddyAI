# stream_tts.py
from flask import Blueprint, request, send_file, jsonify
import io
import os
import requests
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVEN_LABS_API")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Rachel voice

tts_app = Blueprint("tts", __name__)

def generate_itinerary_script(base_plan):
    """Generate spoken text from itinerary JSON."""
    legs = base_plan.get("legs", [])
    assumptions = base_plan.get("assumptions", [])

    lines = ["Here is your planned itinerary for the day:\n"]

    if assumptions:
        lines.append("Assumptions for this plan include: ")
        for a in assumptions:
            lines.append(f"- {a}")
        lines.append("\n")

    for leg in legs:
        sequence = leg.get("sequence", "?")
        mode = leg.get("mode", "activity").capitalize()
        from_loc = leg.get("fromLocation", "Unknown start")
        to_loc = leg.get("toLocation", "Unknown destination")
        depart = leg.get("departTime", "Unknown time")
        arrive = leg.get("arriveTime", "Unknown time")
        reason = leg.get("choiceReasoning", "")

        lines.append(f"Leg {sequence}:")
        lines.append(f"{mode} from {from_loc} departing at {depart}, to {to_loc}, arriving at {arrive}.")
        if reason:
            lines.append(f"Reason: {reason}")
        lines.append("\n")

    return " ".join(lines)

@tts_app.route("/stream-itinerary", methods=["POST"])
def stream_itinerary_tts():
    data = request.json
    base_plan = data.get("base_plan")
    if not base_plan:
        return jsonify({"error": "base_plan missing"}), 400

    # Generate text script
    text = generate_itinerary_script(base_plan)

    # Call Eleven Labs TTS API
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.6,
            "similarity_boost": 0.85,
            "speed": 0.85  # slower speech
        }
    }

    response = requests.post(url, headers=headers, json=payload, stream=True)
    if response.status_code != 200:
        return jsonify({"error": f"TTS failed: {response.status_code} {response.text}"}), 500

    audio_bytes = io.BytesIO(response.content)
    audio_bytes.seek(0)

    # Return audio inline (not as attachment)
    return send_file(
        audio_bytes,
        mimetype="audio/mpeg",
        as_attachment=False,  # Important! Inline playback
        download_name="itinerary.mp3"
    )
