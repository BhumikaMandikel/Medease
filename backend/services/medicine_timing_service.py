"""
Medicine Timing Service

Intelligently calculates medicine timing based on:
- User's meal schedule (from profile)
- Medicine frequency (e.g., "twice a day", "three times a day")
- Common medical timing patterns (before/after meals)
"""

from datetime import datetime, time
from typing import List, Optional
from models.schemas import MealTimes


def parse_time(time_str: str) -> Optional[time]:
    """Parse time string in HH:MM format to time object."""
    try:
        hour, minute = map(int, time_str.split(":"))
        return time(hour, minute)
    except Exception:
        return None


def time_to_str(t: time) -> str:
    """Convert time object to HH:MM string."""
    return f"{t.hour:02d}:{t.minute:02d}"


def add_minutes_to_time(t: time, minutes: int) -> time:
    """Add minutes to a time object (wraps around midnight)."""
    total_minutes = t.hour * 60 + t.minute + minutes
    total_minutes = total_minutes % (24 * 60)  # Wrap around 24 hours
    return time(total_minutes // 60, total_minutes % 60)


def calculate_medicine_timings(
    frequency: str,
    meal_times: MealTimes,
    timing_preference: str = "after_meal"
) -> List[str]:
    """
    Calculate optimal medicine timing based on frequency and meal schedule.
    
    Args:
        frequency: Medicine frequency (e.g., "twice a day", "three times a day", "once daily")
        meal_times: User's meal schedule from profile
        timing_preference: "before_meal" (30 min before) or "after_meal" (30 min after)
    
    Returns:
        List of time strings in HH:MM format (24-hour)
    """
    frequency_lower = frequency.lower()
    
    # Parse meal times with fallbacks
    breakfast_time = (parse_time(meal_times.breakfast) if meal_times.breakfast else None) or time(8, 0)
    lunch_time = (parse_time(meal_times.lunch) if meal_times.lunch else None) or time(13, 0)
    dinner_time = (parse_time(meal_times.dinner) if meal_times.dinner else None) or time(20, 0)
    
    # Determine offset based on preference
    offset_minutes = -30 if timing_preference == "before_meal" else 30
    
    # Calculate timings based on frequency
    timings = []
    
    if "once" in frequency_lower or "daily" in frequency_lower or "1" in frequency_lower:
        # Once daily - typically morning after breakfast
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
    
    elif "twice" in frequency_lower or "2" in frequency_lower or "two times" in frequency_lower:
        # Twice daily - morning and evening
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    elif "three times" in frequency_lower or "thrice" in frequency_lower or "3" in frequency_lower:
        # Three times daily - after each meal
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(lunch_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    elif "four times" in frequency_lower or "4" in frequency_lower:
        # Four times daily - spread throughout the day
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(lunch_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
        # Add bedtime dose (2 hours after dinner)
        timings.append(time_to_str(add_minutes_to_time(dinner_time, 120)))
    
    elif "every" in frequency_lower:
        # Parse "every X hours" pattern
        try:
            # Extract number from patterns like "every 6 hours", "every 8 hours"
            import re
            match = re.search(r'every\s+(\d+)\s+hour', frequency_lower)
            if match:
                hours = int(match.group(1))
                # Start from breakfast time and add intervals
                current_time = breakfast_time
                for _ in range(24 // hours):
                    timings.append(time_to_str(current_time))
                    current_time = add_minutes_to_time(current_time, hours * 60)
        except Exception:
            # Fallback to twice daily if parsing fails
            timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
            timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    else:
        # Default fallback - twice daily
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    return timings


def enhance_medicine_timings(
    medicines: List[dict],
    meal_times: MealTimes
) -> List[dict]:
    """
    Enhance medicine objects with intelligent timing_times if they're empty or incomplete.
    
    Args:
        medicines: List of medicine dicts from Ollama response
        meal_times: User's meal schedule from profile
    
    Returns:
        Enhanced medicines list with calculated timing_times
    """
    for medicine in medicines:
        frequency = medicine.get("frequency", "twice a day")
        frequency_lower = frequency.lower()
        
        # Determine expected number of times based on frequency
        expected_count = 2  # Default for "twice a day"
        if "once" in frequency_lower or "daily" in frequency_lower or "1" in frequency_lower:
            expected_count = 1
        elif "three times" in frequency_lower or "thrice" in frequency_lower or "3" in frequency_lower:
            expected_count = 3
        elif "four times" in frequency_lower or "4" in frequency_lower:
            expected_count = 4
        elif "every" in frequency_lower:
            # For "every X hours", calculate based on 24 hours
            import re
            match = re.search(r'every\s+(\d+)\s+hour', frequency_lower)
            if match:
                hours = int(match.group(1))
                expected_count = 24 // hours
        
        # Get current timing_times
        current_timings = medicine.get("timing_times", [])
        
        # Only calculate if timing_times is empty, incomplete, or has wrong count
        if not current_timings or len(current_timings) < expected_count:
            # Determine timing preference based on medicine instructions
            # Common patterns: "before food", "after food", "with food"
            timing_pref = "after_meal"  # Default
            reason_lower = medicine.get("reason", "").lower()
            warnings_text = " ".join(medicine.get("warnings", [])).lower()
            
            if "before food" in reason_lower or "before meal" in reason_lower or \
               "empty stomach" in reason_lower or "before food" in warnings_text:
                timing_pref = "before_meal"
            
            # Calculate timings
            calculated_timings = calculate_medicine_timings(
                frequency=frequency,
                meal_times=meal_times,
                timing_preference=timing_pref
            )
            
            medicine["timing_times"] = calculated_timings
    
    return medicines

