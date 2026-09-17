"""RunIQ backend entrypoint.

Wires together the FastAPI app, session/CORS middleware, and the
versioned API routers. Business logic lives in app.services /
app.ingestion / app.ml -- this file only assembles the app.
"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import activities, analytics, auth, chat, goals, predictions, weather
from app.core.config import get_settings
from app.services.user_service import get_current_user

settings = get_settings()

app = FastAPI(title="RunIQ API", version="0.1.0")

app.add_middleware(SessionMiddleware, secret_key=settings.session_secret_key)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /login must stay public; everything else behind the login-module gate.
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

_protected = [Depends(get_current_user)]
app.include_router(
    activities.router, prefix="/api/activities", tags=["activities"], dependencies=_protected
)
app.include_router(
    analytics.router, prefix="/api/analytics", tags=["analytics"], dependencies=_protected
)
app.include_router(weather.router, prefix="/api/weather", tags=["weather"], dependencies=_protected)
app.include_router(
    predictions.router, prefix="/api/predictions", tags=["predictions"], dependencies=_protected
)
app.include_router(goals.router, prefix="/api/goals", tags=["goals"], dependencies=_protected)
app.include_router(chat.router, prefix="/api/chat", tags=["chat"], dependencies=_protected)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by Docker/monitoring -- intentionally public."""
    return {"status": "ok"}
