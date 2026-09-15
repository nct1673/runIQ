"""RunIQ backend entrypoint.

Wires together the FastAPI app, CORS, and the versioned API routers.
Business logic lives in app.services / app.ingestion / app.ml -- this file
only assembles the app.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import activities, analytics, chat, goals, predictions, weather
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="RunIQ API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(weather.router, prefix="/api/weather", tags=["weather"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by Docker/monitoring."""
    return {"status": "ok"}
