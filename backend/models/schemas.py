from pydantic import BaseModel
from typing import List, Optional, Literal


class Medicine(BaseModel):
    name: str
    simple_name: str
    reason: str
    dosage: str
    frequency: str
    duration_days: int          # 0 if not mentioned in document
    timing_times: List[str]     # 24-hour format strings e.g. ["08:00", "21:00"]
    warnings: List[str]


class AnalysisResult(BaseModel):
    medicines: List[Medicine]
    narrative_explanation: str  # Patient-facing warm explanation — shown / read aloud
    clinical_context: str       # Dense factual context — never shown; used for Q&A only
    was_scanned_pdf: bool


class CalendarEventRequest(BaseModel):
    medicine_name: str
    dosage: str
    timing_times: List[str]
    duration_days: int
    start_date: str             # ISO date string e.g. "2026-04-25"
    access_token: str
    timezone: str = "Asia/Kolkata"  # IANA timezone string, defaults to IST


class QARequest(BaseModel):
    question: str
    conversation_history: List[dict]
    clinical_context: str
    narrative_explanation: str  # Still accepted from frontend but not used in QA prompt
    language: str = "english"


class ConditionEntry(BaseModel):
    name: str                          # "Type 2 Diabetes"
    simple_name: str                   # "Diabetes"
    status: Literal['active', 'recurring', 'resolved'] = 'active'
    first_noted: str                   # ISO date
    last_seen: str                     # ISO date — updated every visit


class AllergyEntry(BaseModel):
    substance: str                     # "Penicillin"
    severity: Optional[str] = None
    noted_date: str


class MealTimes(BaseModel):
    breakfast: Optional[str] = None   # "08:30" 24hr format
    lunch: Optional[str] = None
    dinner: Optional[str] = None


class MonitoringEntry(BaseModel):
    test_name: str                     # "Blood Glucose"
    for_condition: str                 # "Diabetes"
    frequency_days: int                # 7 = weekly
    last_done: Optional[str] = None
    next_due: Optional[str] = None


class VisitEntry(BaseModel):
    date: str
    conditions_seen: List[str]
    medicines_seen: List[str]


class HealthProfile(BaseModel):
    name: str = ""
    preferred_language: str = "english"
    date_of_birth: Optional[str] = None
    conditions: List[ConditionEntry] = []
    allergies: List[AllergyEntry] = []
    meal_times: MealTimes = MealTimes()
    monitoring: List[MonitoringEntry] = []
    visits: List[VisitEntry] = []      # keep last 50 only
    created_at: str = ""
    updated_at: str = ""
    version: int = 1


class ProfilePatchRequest(BaseModel):
    name: Optional[str] = None
    preferred_language: Optional[str] = None
    date_of_birth: Optional[str] = None
    meal_times: Optional[MealTimes] = None


class LifestyleQARequest(BaseModel):
    question: str
    language: str = "english"


class LifestyleQAResponse(BaseModel):
    answer: str
    suggested_cloud: bool = False