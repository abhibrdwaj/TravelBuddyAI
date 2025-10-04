import os
import requests
from dotenv import load_dotenv
import json

# Load API key from .env
load_dotenv()
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")

if not GNEWS_API_KEY:
    raise ValueError("❌ GNEWS_API_KEY is missing. Check your .env file.")

def get_tourism_related_news(max_results=10):
    # Example query - you can tweak keywords as needed
    query = "New York City OR NYC AND tourists OR events OR restaurants OR attractions OR museums"

    url = "https://gnews.io/api/v4/search"
    params = {
        "category": "entertainment",
        "q": query,
        "lang": "en",
        "country": "us",
        "max": max_results,
        "apikey": GNEWS_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": f"Request failed with status {response.status_code}", "details": data}

    articles = data.get("articles", [])

    # Transform into headline + content JSON only
    results = []
    for article in articles:
        results.append({
            "headline": article.get("title", ""),
            "content": article.get("content", "")
        })

    return {"total_results": len(results), "articles": results}

if __name__ == "__main__":
    news_json = get_tourism_related_news(max_results=10)
    print(json.dumps(news_json, indent=4))
