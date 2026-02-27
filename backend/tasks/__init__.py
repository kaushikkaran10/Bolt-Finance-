"""
NovaX — Celery App Configuration
Task queue with Redis broker for async ML tasks and scheduled jobs.
"""

from celery import Celery
from celery.schedules import crontab

from config import get_settings

settings = get_settings()

celery_app = Celery(
    "novax",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "tasks.prediction_tasks",
        "tasks.news_tasks",
    ],
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Beat Schedule — Recurring tasks
celery_app.conf.beat_schedule = {
    # Fetch & analyze news every 15 seconds
    "fetch-news-every-15-sec": {
        "task": "tasks.news_tasks.fetch_and_analyze_news",
        "schedule": 15.0,
    },
    # Resolve predictions at market close (4:30 PM EST, M-F)
    "resolve-predictions-daily": {
        "task": "tasks.prediction_tasks.resolve_predictions",
        "schedule": crontab(minute=30, hour=16, day_of_week="1-5"),
    },
}
