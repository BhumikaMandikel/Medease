from fastapi import APIRouter, HTTPException

from models.schemas import CalendarEventRequest
from services.calendar_service import add_calendar_events

router = APIRouter()


@router.post("/add-events")
async def add_events(event_req: CalendarEventRequest):
    """Create Google Calendar reminder events for a single medicine."""
    try:
        result = await add_calendar_events(event_req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result