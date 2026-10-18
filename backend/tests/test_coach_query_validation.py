"""validate_sql: the coach's free-form SQL tool must accept plain SELECTs over
the coach views and reject everything else with a short reason. (The coach_ro
role is the real boundary; this layer gives clear errors and blocks tricks.)"""
import pytest

from app.services.coach.query_tool import validate_sql

ALLOWED = [
    "select * from activities limit 5",
    "select * from coach.races where status ilike '%up%'",
    "with a as (select * from activities) select count(*) from a",
    "select a.id from activities a join weather w on w.activity_id = a.id",
    "select 1 union select 2",
    "select * from activities where started_at > now() - interval '7 days'",
    "select * from activities;",
]

REJECTED = [
    "",
    "select 1; drop table activities",
    "insert into races values (1)",
    "delete from races",
    "copy activities to stdout",
    "show all",
    "explain analyze select 1",
    "select * into newt from activities",
    "select * from activities for update",
    "select * from users",
    "select * from public.activities",
    "select * from pg_catalog.pg_tables",
    "select * from information_schema.tables",
    "select * from coach.activities, pg_roles",
    "select (select rolname from pg_authid limit 1)",
    "select pg_sleep(10)",
    "select set_config('app.session_token', 'x', false)",
    "select current_setting('is_superuser')",
    "select version()",
    "select pg_read_file('/etc/passwd')",
    "select lo_import('/etc/passwd')",
    "select * from dblink('x', 'select 1') as t(a int)",
    "select query_to_xml('select * from users', true, true, '')",
    "select current_user",
    "select session_user",
    "select current_database()",
    "select inet_server_addr()",
]


@pytest.mark.parametrize("sql", ALLOWED)
def test_allows_read_only_selects(sql):
    assert validate_sql(sql)


@pytest.mark.parametrize("sql", REJECTED)
def test_rejects_everything_else(sql):
    with pytest.raises(ValueError):
        validate_sql(sql)
