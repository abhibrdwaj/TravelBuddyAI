# stream_tts.py
from flask import Flask, request, send_file, jsonify
import os
import tempfile
from elevenlabs import generate, save

app = Flask(__name__)

@app.route('/stream-tts', methods=['POST'])
def stream_tts():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        itinerary_text = data.get("itinerary")
        if not itinerary_text:
            return jsonify({"error": "Missing 'itinerary' field"}), 400

        # Generate speech
        audio = generate(
            text=itinerary_text,
            voice="Rachel",
            model="eleven_multilingual_v2",
            stream=False,
            # Adjust speed here
            voice_settings={"stability": 0.5, "similarity_boost": 0.75, "style": 0.3, "speaking_rate": 0.85}
        )

        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        save(audio, temp_file.name)

        return send_file(temp_file.name, mimetype="audio/mpeg", as_attachment=False)

    except Exception as e:
        print("TTS Error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # You can run this separately on a different port if needed
    app.run(port=5001, debug=True)
