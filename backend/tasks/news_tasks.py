"""
NovaX — News Celery Tasks
Scheduled task: fetch financial news from NewsAPI, analyze with FinBERT, store in MongoDB.
Runs every 30 minutes via Celery Beat.
"""

import asyncio
from datetime import datetime, timezone

from tasks import celery_app


@celery_app.task(name="tasks.news_tasks.fetch_and_analyze_news")
def fetch_and_analyze_news():
    """
    Celery Beat task (every 30 min):
    1. Fetch financial news from NewsAPI.org
    2. Clean and preprocess text
    3. Run FinBERT inference (sentiment + score)
    4. Map to market impact (High/Med/Low)
    5. Store enriched articles in MongoDB
    """
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient

    from config import get_settings
    from services.news_service import NewsService

    settings = get_settings()

    async def _fetch_and_analyze():
        print("  📰 Fetching financial news...")

        # 1. Fetch from NewsAPI
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://newsapi.org/v2/top-headlines",
                params={
                    "category": "business",
                    "language": "en",
                    "pageSize": 20,
                    "apiKey": settings.news_api_key,
                },
                timeout=30.0,
            )

            if response.status_code != 200:
                print(f"  ⚠️ NewsAPI error: {response.status_code}")
                return

            data = response.json()
            articles = data.get("articles", [])

        if not articles:
            print("  📰 No new articles found")
            return

        print(f"  📰 Fetched {len(articles)} articles")

        # 2. Check MongoDB out of the fetched articles, which ones are NEW
        mongo_client = AsyncIOMotorClient(settings.mongodb_url)
        db = mongo_client[settings.mongodb_db_name]
        collection = db["news_articles"]

        fetched_urls = [a.get("url") for a in articles if a.get("url")]
        
        # Find URLs that already exist in our DB
        existing_docs = await collection.find({"url": {"$in": fetched_urls}}, {"url": 1}).to_list(length=None)
        existing_urls = {doc["url"] for doc in existing_docs}

        # Filter to only process NEW articles
        new_articles = [a for a in articles if a.get("url") and a.get("url") not in existing_urls]

        if not new_articles:
            print("  📰 No new articles to process this cycle")
            mongo_client.close()
            return

        print(f"  📰 Found {len(new_articles)} new articles to analyze")

        # 3. Run FinBERT sentiment analysis on ONLY new articles
        texts = []
        for article in new_articles:
            title = article.get("title", "")
            description = article.get("description", "")
            text = f"{title}. {description}" if description else title
            texts.append(text)

        print("  🧠 Running FinBERT analysis...")
        sentiments = NewsService.analyze_batch(texts)

        # 4. Store NEW articles in MongoDB
        enriched_articles = []
        for article, sentiment in zip(new_articles, sentiments):
            doc = {
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "source": article.get("source", {}).get("name", "Unknown"),
                "url": article.get("url", ""),
                "image_url": article.get("urlToImage"),
                "published_at": datetime.fromisoformat(
                    article.get("publishedAt", "").replace("Z", "+00:00")
                ) if article.get("publishedAt") else datetime.now(timezone.utc),
                "sentiment": sentiment["sentiment"],
                "sentiment_score": sentiment["score"],
                "impact": sentiment["impact"],
                "fetched_at": datetime.now(timezone.utc),
            }

            # Upsert by URL to avoid duplicates
            await collection.update_one(
                {"url": doc["url"]},
                {"$set": doc},
                upsert=True,
            )
            enriched_articles.append(doc)

        mongo_client.close()

        # 5. Update Redis cache with latest summary
        import redis as sync_redis
        import json

        r = sync_redis.from_url(settings.redis_url, decode_responses=True)

        # Cache latest batch summary
        summary = {
            "total": len(enriched_articles),
            "positive": sum(1 for a in enriched_articles if a["sentiment"] == "positive"),
            "negative": sum(1 for a in enriched_articles if a["sentiment"] == "negative"),
            "neutral": sum(1 for a in enriched_articles if a["sentiment"] == "neutral"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        r.setex("cache:news:latest", 1800, json.dumps(summary))  # 30m TTL

        print(f"  ✅ Stored {len(enriched_articles)} enriched articles in MongoDB")
        print(f"  📊 Sentiment: {summary['positive']}+ / {summary['negative']}- / {summary['neutral']}~")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_fetch_and_analyze())
    finally:
        loop.close()
