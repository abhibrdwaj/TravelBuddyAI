import os
from dotenv import load_dotenv
import requests

# Load .env file
load_dotenv()

# Now retrieve the API key
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")

if not GNEWS_API_KEY:
    raise ValueError("❌ GNEWS_API_KEY is missing. Check your .env file.")

def get_nyc_tourism_news_gnews(max_results=20):
    query = "New York City OR NYC AND tourists OR events OR restaurants OR attractions"
    url = "https://gnews.io/api/v4/search"

    params = {
        "category": "entertainment",
        "q": query,
        "lang": "en",
        "country": "us",
        "page":2,
        "max": max_results,
        "apikey": GNEWS_API_KEY
    }

    response = requests.get(url, params=params)
    data = response.json()

    if response.status_code != 200:
        print(f"❌ Error {response.status_code}: {data.get('message', data)}")
        return

    articles = data.get("articles", [])
    print(f"\n🗽 Top {len(articles)} NYC Tourism News Articles from GNews:\n")
    for article in articles:
        print(f"📰 {article['title']}")
        print(f"📝 {article['description']}")
        print(f"🔗 {article['url']}")
        print("-" * 100)

if __name__ == "__main__":
    get_nyc_tourism_news_gnews()
