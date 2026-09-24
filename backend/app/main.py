"""RunIQ backend entrypoint.

Wires together the FastAPI app, session/CORS middleware, and the
versioned API routers. Business logic lives in app.services /
app.ingestion / app.ml -- this file only assembles the app.
"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import activities, analytics, auth, chat, predictions, profile, races, weather
from app.core.config import get_settings
from app.services.user_service import get_current_user

settings = get_settings()

app = FastAPI(
    title="RunIQ API",
    version="0.1.0",
    # Starlette's default (True) redirects a request missing a route's
    # trailing slash using an ABSOLUTE URL built from *this* process's
    # own host -- fine hit directly, but fatal behind the frontend's
    # rewrite proxy: the proxy passes that redirect through unchanged,
    # so the browser follows it straight to the backend's real
    # host:port instead of staying on the frontend's origin, turning an
    # intended same-origin call into a real cross-origin one (hits CORS,
    # and drops cookies since fetch() doesn't send credentials
    # cross-origin by default). Every route in app.api.routes is defined
    # to match its exact expected path already (see e.g.
    # activities.py's list route), so nothing depends on this redirect.
    redirect_slashes=False,
)

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
app.include_router(races.router, prefix="/api/races", tags=["races"], dependencies=_protected)
app.include_router(chat.router, prefix="/api/chat", tags=["chat"], dependencies=_protected)
app.include_router(profile.router, prefix="/api/profile", tags=["profile"], dependencies=_protected)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by Docker/monitoring -- intentionally public."""
    return {"status": "ok"}
