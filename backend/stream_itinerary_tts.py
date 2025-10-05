import json
import requests
from dotenv import load_dotenv
import os

load_dotenv()

# Replace with your actual ElevenLabs API key
ELEVENLABS_API_KEY = os.getenv("ELEVEN_LABS_API")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Example voice ID (Rachel)
JSON_FILE_PATH = "itinerary_test.json"

def generate_itinerary_script(base_plan):
    """
    Generate a spoken script from the 'base_plan.legs' section of the JSON.
    """
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
        cost = leg.get("costEstimateUSD", 0)
        reason = leg.get("choiceReasoning", "")

        lines.append(f"Leg {sequence}:")
        lines.append(f"{mode} from {from_loc} departing at {depart}, to {to_loc}, arriving at {arrive}.")
        if reason:
            lines.append(f"Reason: {reason}")
        lines.append(f"Estimated cost is {cost} dollars.\n")

    return " ".join(lines)

def stream_tts(text):
    """
    Stream ElevenLabs audio as it's generated.
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.6,
            "similarity_boost": 0.85,
            "speaking_rate": 0.85   # 👈 slows down the speech slightly
        }
    }

    with requests.post(url, headers=headers, json=payload, stream=True) as response:
        if response.status_code != 200:
            print(f"❌ Streaming failed: {response.status_code} - {response.text}")
            return
        for chunk in response.iter_content(chunk_size=4096):
            if chunk:
                yield chunk

def save_and_play_stream(audio_generator, output_file="itinerary_tts.mp3"):
    """
    Save streamed audio to a file.
    """
    with open(output_file, "wb") as f:
        print("🎧 Streaming & saving audio...")
        for chunk in audio_generator:
            f.write(chunk)
    print(f"✅ Audio saved as {output_file}")

if __name__ == "__main__":
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    base_plan = data.get("base_plan", {})
    if not base_plan:
        print("❌ 'base_plan' not found in JSON.")
    else:
        script = generate_itinerary_script(base_plan)
        print("📝 Generated Itinerary Script:\n", script)

        # Stream the TTS
        audio_stream = stream_tts(script)
        save_and_play_stream(audio_stream)
