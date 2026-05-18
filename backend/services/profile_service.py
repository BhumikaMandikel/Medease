import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Tuple
from models.schemas import (
    HealthProfile, ConditionEntry, AllergyEntry, 
    MonitoringEntry, VisitEntry, MealTimes
)


# Monitoring cadence table
MONITORING_CADENCE = {

    # =========================
    # DIABETES / METABOLIC
    # =========================
    "type 2 diabetes": [
        {"test_name": "Blood Glucose", "frequency_days": 1},
        {"test_name": "HbA1c", "frequency_days": 180},
        {"test_name": "Blood Pressure", "frequency_days": 7},
        {"test_name": "Creatinine / eGFR", "frequency_days": 180},
        {"test_name": "Urine Microalbumin", "frequency_days": 365},
        {"test_name": "Eye Exam", "frequency_days": 365},
        {"test_name": "Foot Exam", "frequency_days": 365}
    ],

    "prediabetes": [
        {"test_name": "HbA1c", "frequency_days": 365},
        {"test_name": "Weight", "frequency_days": 30}
    ],

    "obesity": [
        {"test_name": "Weight", "frequency_days": 7},
        {"test_name": "Blood Pressure", "frequency_days": 30},
        {"test_name": "HbA1c", "frequency_days": 365},
        {"test_name": "Lipid Panel", "frequency_days": 365}
    ],

    # =========================
    # CARDIOVASCULAR
    # =========================
    "hypertension": [
        {"test_name": "Blood Pressure", "frequency_days": 1},
        {"test_name": "Creatinine / eGFR", "frequency_days": 180},
        {"test_name": "Potassium", "frequency_days": 180}
    ],

    "coronary artery disease": [
        {"test_name": "Blood Pressure", "frequency_days": 7},
        {"test_name": "Lipid Panel", "frequency_days": 365},
        {"test_name": "Weight", "frequency_days": 30}
    ],

    "heart failure": [
        {"test_name": "Weight", "frequency_days": 1},
        {"test_name": "Blood Pressure", "frequency_days": 7},
        {"test_name": "Creatinine / eGFR", "frequency_days": 90},
        {"test_name": "Potassium", "frequency_days": 90}
    ],

    "atrial fibrillation": [
        {"test_name": "Heart Rate", "frequency_days": 1},
        {"test_name": "Blood Pressure", "frequency_days": 7}
    ],

    "hyperlipidemia": [
        {"test_name": "Lipid Panel", "frequency_days": 365},
        {"test_name": "Liver Function Test", "frequency_days": 365}
    ],

    # =========================
    # KIDNEY
    # =========================
    "chronic kidney disease": [
        {"test_name": "Creatinine / eGFR", "frequency_days": 90},
        {"test_name": "Potassium", "frequency_days": 90},
        {"test_name": "Urine Protein", "frequency_days": 180},
        {"test_name": "Blood Pressure", "frequency_days": 7}
    ],

    # =========================
    # RESPIRATORY
    # =========================
    "copd": [
        {"test_name": "Oxygen Saturation", "frequency_days": 7},
        {"test_name": "Spirometry", "frequency_days": 365},
        {"test_name": "Weight", "frequency_days": 30}
    ],

    "asthma": [
        {"test_name": "Peak Flow", "frequency_days": 30},
        {"test_name": "Spirometry", "frequency_days": 365}
    ],

    # =========================
    # THYROID
    # =========================
    "hypothyroidism": [
        {"test_name": "TSH", "frequency_days": 365}
    ],

    # =========================
    # BONE HEALTH
    # =========================
    "osteoporosis": [
        {"test_name": "DEXA Scan", "frequency_days": 730},
        {"test_name": "Vitamin D", "frequency_days": 365}
    ],

    # =========================
    # ANEMIA
    # =========================
    "anemia": [
        {"test_name": "CBC", "frequency_days": 180},
        {"test_name": "Ferritin", "frequency_days": 180}
    ],

    # =========================
    # NEUROLOGIC / COGNITIVE
    # =========================
    "dementia": [
        {"test_name": "Weight", "frequency_days": 30},
        {"test_name": "Cognitive Assessment", "frequency_days": 365}
    ],

    "parkinson disease": [
        {"test_name": "Weight", "frequency_days": 30},
        {"test_name": "Fall Risk Assessment", "frequency_days": 365}
    ],

    # =========================
    # MENTAL HEALTH / MEDICATION
    # =========================
    "bipolar disorder": [
        {"test_name": "Lithium Level", "frequency_days": 90},
        {"test_name": "Creatinine / eGFR", "frequency_days": 180},
        {"test_name": "TSH", "frequency_days": 180}
    ],

    # =========================
    # ANTICOAGULATION
    # =========================
    "warfarin therapy": [
        {"test_name": "INR", "frequency_days": 30}
    ]
}


def get_profile_path() -> Path:
    """Get the path to the profile file."""
    home = Path.home()
    profile_dir = home / ".medease"
    return profile_dir / "profile.json"


def load_profile() -> HealthProfile:
    """
    Load profile from disk. Returns blank profile if missing or corrupt.
    Never raises exceptions.
    """
    try:
        profile_path = get_profile_path()
        if not profile_path.exists():
            return HealthProfile()
        
        with open(profile_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return HealthProfile(**data)
    except Exception:
        # Return blank profile on any error
        return HealthProfile()


def save_profile(profile: HealthProfile) -> None:
    """
    Save profile to disk. Creates directory if needed.
    Updates updated_at timestamp.
    """
    try:
        profile_path = get_profile_path()
        profile_dir = profile_path.parent
        
        # Create directory if it doesn't exist
        profile_dir.mkdir(parents=True, exist_ok=True)
        
        # Update timestamp
        profile.updated_at = datetime.utcnow().isoformat()
        
        # If created_at is empty, set it
        if not profile.created_at:
            profile.created_at = profile.updated_at
        
        # Write to file
        with open(profile_path, 'w', encoding='utf-8') as f:
            json.dump(profile.model_dump(), f, indent=2, ensure_ascii=False)
    except Exception as e:
        # Silent failure - profile save should never break the app
        print(f"Warning: Failed to save profile: {e}")


def merge_conditions_into_profile(
    profile: HealthProfile,
    conditions_found: List[str],
    simple_names: Dict[str, str]
) -> None:
    """
    Merge newly found conditions into the profile.
    - Updates last_seen for existing conditions
    - Adds new conditions
    - Sets status to 'recurring' if previously 'resolved'
    - Auto-creates monitoring entries for known conditions
    """
    today = datetime.utcnow().date().isoformat()
    
    for condition_name in conditions_found:
        simple_name = simple_names.get(condition_name, condition_name)
        
        # Check if condition already exists
        existing = None
        for cond in profile.conditions:
            if cond.name.lower() == condition_name.lower():
                existing = cond
                break
        
        if existing:
            # Update existing condition
            existing.last_seen = today
            if existing.status == 'resolved':
                existing.status = 'recurring'
        else:
            # Add new condition
            new_condition = ConditionEntry(
                name=condition_name,
                simple_name=simple_name,
                status='active',
                first_noted=today,
                last_seen=today
            )
            profile.conditions.append(new_condition)
            
            # Auto-create monitoring entries for this condition
            _create_monitoring_for_condition(profile, simple_name)


def _create_monitoring_for_condition(profile: HealthProfile, simple_name: str) -> None:
    """Create monitoring entries for a condition based on the cadence table."""
    simple_lower = simple_name.lower()
    
    if simple_lower in MONITORING_CADENCE:
        for monitor_spec in MONITORING_CADENCE[simple_lower]:
            # Check if monitoring entry already exists
            exists = any(
                m.test_name == monitor_spec["test_name"] and 
                m.for_condition.lower() == simple_lower
                for m in profile.monitoring
            )
            
            if not exists:
                profile.monitoring.append(MonitoringEntry(
                    test_name=monitor_spec["test_name"],
                    for_condition=simple_name,
                    frequency_days=monitor_spec["frequency_days"]
                ))


def merge_allergies_into_profile(
    profile: HealthProfile,
    allergies_found: List[str]
) -> None:
    """
    Merge newly found allergies into the profile.
    Never duplicates.
    """
    today = datetime.utcnow().date().isoformat()
    
    for allergy_substance in allergies_found:
        # Check if allergy already exists
        exists = any(
            a.substance.lower() == allergy_substance.lower()
            for a in profile.allergies
        )
        
        if not exists:
            profile.allergies.append(AllergyEntry(
                substance=allergy_substance,
                noted_date=today
            ))


def add_visit_to_profile(
    profile: HealthProfile,
    conditions_seen: List[str],
    medicines_seen: List[str]
) -> None:
    """
    Add a visit record to the profile.
    Keeps only the last 50 visits.
    """
    today = datetime.utcnow().date().isoformat()
    
    visit = VisitEntry(
        date=today,
        conditions_seen=conditions_seen,
        medicines_seen=medicines_seen
    )
    
    profile.visits.append(visit)
    
    # Keep only last 50 visits
    if len(profile.visits) > 50:
        profile.visits = profile.visits[-50:]


def build_profile_context_prompt(profile: HealthProfile, include_meal_times: bool = False) -> str:
    """
    Build the invisible context block injected into every Ollama system prompt.
    Returns empty string if profile has no meaningful data yet.
    
    Args:
        profile: The health profile
        include_meal_times: If True, includes meal times (for prescription processing only)
    """
    # Check if profile has meaningful data
    if not profile.name and not profile.conditions and not profile.allergies:
        return ""
    
    lines = ["PATIENT CONTEXT (from previous visits — use silently):"]
    
    if profile.name:
        lines.append(f"- Patient name: {profile.name}")
    
    if profile.conditions:
        active_conditions = [c.simple_name for c in profile.conditions if c.status in ['active', 'recurring']]
        if active_conditions:
            lines.append(f"- Known conditions: {', '.join(active_conditions)}")
    
    if profile.allergies:
        allergy_list = [a.substance for a in profile.allergies]
        lines.append(f"- Known allergies: {', '.join(allergy_list)} — FLAG if any new medicine conflicts")
    
    # Only include meal times for prescription processing (document analysis)
    if include_meal_times and (profile.meal_times.breakfast or profile.meal_times.lunch or profile.meal_times.dinner):
        meal_parts = []
        if profile.meal_times.breakfast:
            meal_parts.append(f"breakfast {profile.meal_times.breakfast}")
        if profile.meal_times.lunch:
            meal_parts.append(f"lunch {profile.meal_times.lunch}")
        if profile.meal_times.dinner:
            meal_parts.append(f"dinner {profile.meal_times.dinner}")
        if meal_parts:
            lines.append(f"- Meal times: {', '.join(meal_parts)} — use for dosage timing")
    
    lines.append("")
    lines.append("Use this context naturally. Address patient by name. Do not mention")
    lines.append("that you have a profile or prior history.")
    
    return "\n".join(lines)


def get_due_monitoring(profile: HealthProfile) -> List[MonitoringEntry]:
    """
    Get monitoring entries that are due within the next 7 days
    or have no next_due set yet.
    """
    today = datetime.utcnow().date()
    seven_days_later = today + timedelta(days=7)
    
    due_entries = []
    
    for entry in profile.monitoring:
        if not entry.next_due:
            # No next_due set, so it's due
            due_entries.append(entry)
        else:
            try:
                next_due_date = datetime.fromisoformat(entry.next_due).date()
                if next_due_date <= seven_days_later:
                    due_entries.append(entry)
            except Exception:
                # If date parsing fails, include it as due
                due_entries.append(entry)
    
    return due_entries


def mark_monitoring_done(profile: HealthProfile, test_name: str) -> bool:
    """
    Mark a monitoring test as done today and compute next_due.
    Returns True if successful, False if test not found.
    """
    today = datetime.utcnow().date()
    
    for entry in profile.monitoring:
        if entry.test_name == test_name:
            entry.last_done = today.isoformat()
            next_due_date = today + timedelta(days=entry.frequency_days)
            entry.next_due = next_due_date.isoformat()
            return True
    
    return False

