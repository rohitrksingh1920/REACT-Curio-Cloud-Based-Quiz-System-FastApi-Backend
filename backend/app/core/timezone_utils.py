"""
timezone_utils.py
-----------------
Central IST (India Standard Time, UTC+5:30) timezone helper.

Import `now_ist()` anywhere instead of `datetime.now(timezone.utc)`.
Import `IST` as the tzinfo object wherever you need to attach the timezone.

Usage:
    from backend.app.core.timezone_utils import now_ist, IST

    ts  = now_ist()                          # aware datetime in IST
    exp = now_ist() + timedelta(minutes=10)  # 10 minutes from now, IST
"""

from datetime import datetime, timezone, timedelta

# India Standard Time offset: UTC + 5 hours 30 minutes
IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def now_ist() -> datetime:
    """Return the current datetime as a timezone-aware IST datetime."""
    return datetime.now(IST)


def utc_to_ist(dt: datetime) -> datetime:
    """Convert any aware UTC datetime to IST."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Treat naive datetimes as UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)


def ist_to_utc(dt: datetime) -> datetime:
    """Convert an IST datetime back to UTC (for DB writes if needed)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt.astimezone(timezone.utc)
