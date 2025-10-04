import requests
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")  # Replace with your real API key
BASE_URL = "http://api.openweathermap.org/data/2.5/weather"

FORECAST_URL = "http://api.openweathermap.org/data/2.5/forecast"

def get_forecast(location, target_time):
    """
    target_time: datetime object for the time you want the forecast for
    """
    params = {
        "q": location,
        "appid": WEATHER_API_KEY,
        "units": "metric"
    }
    
    response = requests.get(FORECAST_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        forecasts = data["list"]
        
        # Find the forecast closest to target_time
        closest = min(forecasts, key=lambda f: abs(
            datetime.datetime.fromtimestamp(f["dt"]) - target_time
        ))
        
        weather = closest["weather"][0]
        main = closest["main"]
        forecast_time = datetime.datetime.fromtimestamp(closest["dt"])
        
        print(f"Forecast for {forecast_time} in {data['city']['name']}:")
        print(f"Temperature: {main['temp']} °C")
        print(f"Condition: {weather['description'].title()}")
        print(f"Humidity: {main['humidity']}%")
        print(f"Wind Speed: {closest['wind']['speed']} m/s")
    else:
        print("❌ Could not retrieve forecast data:", response.json())


target = datetime.datetime(2025, 10, 5, 19, 0)  # YYYY, M, D, H, M
get_forecast("New York City", target)
