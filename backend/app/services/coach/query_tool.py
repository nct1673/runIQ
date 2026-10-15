"""Free-form read-only SQL tool for questions the fixed tools in
sql_tool.py can't answer. Runs on the `coach_ro` role via readonly_db --
see that module for why the database, not this file, is the safety
boundary. `validate_sql` below is an extra layer, not the guarantee.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

import sqlglot
from sqlalchemy.exc import SQLAlchemyError
from sqlglot import errors as sqlglot_errors
from sqlglot import exp

from app.services.coach import readonly_db

MAX_ROWS = 200

# Shown to the model in the tool description (router.py) so it knows what
# it can query. Keep in sync with migration c04a7d1e5b92.
SCHEMA_HELP = """PostgreSQL, SELECT only, one statement. Already filtered to the current user. \
Views (schema `coach`):
- activities(id, started_at, distance_km, duration_s, avg_pace_s_per_km, avg_hr, avg_cadence, \
elevation_gain_m, activity_type, activity_name, calories, avg_power, avg_stride_length, \
avg_vertical_oscillation, avg_ground_contact_time, vo2_max, hr_time_in_zone_1..5, location, ...)
- weather(activity_id, temperature_c, feels_like_c, humidity_pct, wind_speed_kmh, precipitation_mm, condition)
- races(name, distance_km, race_date, race_time, location, goal_time_s, goal_time_hms, priority, status, actual_time_s, actual_time_hms)
- personal_records(label, metric, value, time_hms, activity_name, achieved_at)
- video_analyses(id, status, result, uploaded_at, analyzed_at)
- profile(sex, height_cm, weight_kg, resting_hr, max_hr, unit_system)
Pace is seconds per km. Results are capped at 200 rows.
Stored values (use these exactly; match text with ILIKE '%term%', never =, and distances with ranges):
- personal_records.label: '1 km', '1 mile', '5 km', '10 km', 'Half Marathon', 'Marathon', 'Longest Run'. \
metric is 'time_s' (seconds) except 'Longest Run' which is 'distance_m' (metres).
- races.status: 'upcoming' or 'completed'. Race distance_km is approximate (half ~21.1, marathon ~42.2): \
filter with ranges, and rely on `name` too. goal_time_s / actual_time_s can be NULL.
- To list the user's PRs or races, SELECT * with no filter first; the tables are small.
- Times: quote time_hms / goal_time_hms / actual_time_hms exactly as returned (already H:MM:SS); never \
convert seconds yourself. Compute differences in SQL (e.g. goal_time_s - value) instead of by hand."""


ALLOWED_VIEWS = {"activities", "weather", "races", "personal_records", "video_analyses", "profile"}

# Anything that reads server state, touches files/other databases, sleeps,
# or holds locks. Exact names plus prefixes.
_BLOCKED_FUNCS = {
    "set_config", "current_setting", "pg_sleep", "pg_sleep_for", "pg_sleep_until",
    "nextval", "setval", "currval", "txid_current", "query_to_xml", "table_to_xml",
    "database_to_xml", "schema_to_xml", "xpath", "version", "current_version",
}
_BLOCKED_PREFIXES = (
    "dblink", "lo_", "pg_read", "pg_ls", "pg_stat", "pg_terminate", "pg_cancel", "pg_reload",
    "pg_advisory", "pg_try_advisory", "pg_logical", "pg_replication", "pg_notify", "pg_rotate",
    "pg_switch", "pg_create", "pg_drop", "pg_file", "pg_get", "pg_backend", "pg_export",
)
_FORBIDDEN_NODES = (
    exp.Insert, exp.Update, exp.Delete, exp.Merge, exp.Create, exp.Drop, exp.Alter,
    exp.Command, exp.Set, exp.Into, exp.Lock, exp.Copy, exp.Transaction, exp.Use,
)


def validate_sql(sql: str) -> str:
    """Accept exactly one read-only SELECT over the coach views, else
    raise ValueError with a short reason (shown to the model so it can
    retry). Defense in depth: the coach_ro role and token-scoped views are
    what actually protect the data, this gives clear errors and removes
    the obvious tricks (set_config, pg_sleep, system catalogs, ...).
    """
    sql = sql.strip().rstrip(";").strip()
    if not sql:
        raise ValueError("empty query")
    try:
        statements = [s for s in sqlglot.parse(sql, read="postgres") if s is not None]
    except sqlglot_errors.SqlglotError:
        raise ValueError("could not parse the SQL as PostgreSQL") from None
    if len(statements) != 1:
        raise ValueError("exactly one statement is allowed")
    tree = statements[0]
    if not isinstance(tree, (exp.Select, exp.Union, exp.Intersect, exp.Except)):
        raise ValueError("only SELECT queries are allowed")

    for node in tree.walk():
        if isinstance(node, _FORBIDDEN_NODES):
            raise ValueError(f"{type(node).__name__} is not allowed")

    cte_names = {cte.alias_or_name.lower() for cte in tree.find_all(exp.CTE)}
    for table in tree.find_all(exp.Table):
        name = table.name.lower()
        if isinstance(table.this, exp.Func):  # e.g. FROM generate_series(...)
            continue
        if name in cte_names and not table.db:
            continue
        if table.db.lower() not in ("", "coach") or name not in ALLOWED_VIEWS:
            raise ValueError(f"table '{table.sql()}' is not available; use only: {sorted(ALLOWED_VIEWS)}")

    for func in tree.find_all(exp.Func):
        name = (func.name if isinstance(func, exp.Anonymous) else func.sql_name()).lower()
        if name in _BLOCKED_FUNCS or name.startswith(_BLOCKED_PREFIXES):
            raise ValueError(f"function '{name}' is not allowed")

    return sql


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date, time, uuid.UUID)):
        return str(value)
    return str(value)


def run_readonly_query(user_id: uuid.UUID, sql: str) -> dict:
    """Run `sql` as the current user on the read-only role. Errors are
    returned as {"error": ...} so the model can correct itself rather than
    the request failing."""
    try:
        sql = validate_sql(sql)
        with readonly_db.readonly_session(user_id) as session:
            # psycopg2 treats '%' as a format marker once a params tuple is passed (and
            # SQLAlchemy won't run driver SQL without one), so escape it.
            result = session.connection().exec_driver_sql(sql.replace("%", "%%"), ())
            columns = list(result.keys())
            rows = result.fetchmany(MAX_ROWS + 1)
    except ValueError as exc:
        return {"error": f"Query rejected: {exc}"}
    except SQLAlchemyError as exc:
        # Primary message only: no DETAIL/CONTEXT lines, which can quote row values.
        orig = getattr(exc, "orig", None)
        message = getattr(getattr(orig, "diag", None), "message_primary", None)
        return {"error": (message or "query failed").strip()[:200]}
    except RuntimeError:
        return {"error": "SQL tool is not configured on the server"}

    truncated = len(rows) > MAX_ROWS
    rows = rows[:MAX_ROWS]
    return {
        "columns": columns,
        "rows": [[_json_safe(v) for v in row] for row in rows],
        "row_count": len(rows),
        "truncated": truncated,
    }
