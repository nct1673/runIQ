"""CSV -> validated -> normalized activity data pipeline.

Kept independent of any HTTP/API concern so the same functions can later
be called from a scheduled Strava-API sync job instead of the upload
endpoint in `app.api.routes.activities`.
"""
