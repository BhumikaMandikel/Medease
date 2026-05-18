import datetime
from zoneinfo import ZoneInfo

import httpx

from models.schemas import CalendarEventRequest

GOOGLE_CALENDAR_URL = (
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
)
EVENT_DURATION_MINUTES = 15


async def add_calendar_events(event_request: CalendarEventRequest) -> dict:
    """
    Create one Google Calendar reminder event per (day × timing_time) combination
    for the requested medicine.

    Raises Exception on auth failure or network error.
    Returns dict with success status and count of events created.
    """
    headers = {
        "Authorization": f"Bearer {event_request.access_token}",
        "Content-Type": "application/json",
    }

    # Parse base date and use timezone from request
    base_date = datetime.datetime.strptime(event_request.start_date, "%Y-%m-%d")
    user_timezone = event_request.timezone  # Use timezone from request
    tz = ZoneInfo(user_timezone)
    events_created = 0

    async with httpx.AsyncClient(timeout=30) as client:
        for day in range(event_request.duration_days):
            event_date = (base_date + datetime.timedelta(days=day)).date()

            for time_str in event_request.timing_times:
                # Validate and parse time string
                try:
                    hour, minute = map(int, time_str.split(":"))
                    if not (0 <= hour < 24 and 0 <= minute < 60):
                        print(f"⚠️  Invalid time {time_str}, skipping")
                        continue
                except (ValueError, AttributeError):
                    print(f"⚠️  Malformed time string {time_str}, skipping")
                    continue

                # Create timezone-aware datetime objects
                dt_start = datetime.datetime(
                    event_date.year, event_date.month, event_date.day,
                    hour, minute, tzinfo=tz
                )
                dt_end = dt_start + datetime.timedelta(minutes=EVENT_DURATION_MINUTES)

                # Format as ISO 8601 with timezone
                start_str = dt_start.isoformat()
                end_str = dt_end.isoformat()

                payload = {
                    "summary": f"💊 Take {event_request.medicine_name}",
                    "description": (
                        f"Dosage: {event_request.dosage}\n"
                        f"Medicine: {event_request.medicine_name}"
                    ),
                    "start": {"dateTime": start_str, "timeZone": user_timezone},
                    "end": {"dateTime": end_str, "timeZone": user_timezone},
                    "reminders": {
                        "useDefault": False,
                        "overrides": [{"method": "popup", "minutes": 5}],
                    },
                }

                resp = await client.post(
                    GOOGLE_CALENDAR_URL, headers=headers, json=payload
                )

                if resp.status_code == 401:
                    raise Exception(
                        "Google token expired or invalid. Please sign in again."
                    )
                if resp.status_code not in (200, 201):
                    raise Exception(
                        f"Google Calendar API error {resp.status_code}: {resp.text}"
                    )

                events_created += 1

    return {
        "success": True,
        "events_created": events_created,
        "message": (
            f"{events_created} reminders added for {event_request.medicine_name}"
        ),
    }