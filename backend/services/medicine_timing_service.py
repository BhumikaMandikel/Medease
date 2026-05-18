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


def parse_dose_pattern(frequency: str) -> Optional[tuple[int, List[str]]]:
    """
    Parse medical dose patterns like "1-1-1", "1-0-1", "0-1-0", "0-2-0", "0-0-1/2" etc.
    Returns (dose_count, meal_indicators) tuple, or None if pattern not found.
    
    IMPORTANT: The count represents NUMBER OF TIMES PER DAY (number of meals), NOT total tablets.
    
    Common patterns:
    - "1-1-1" = 3 times per day → (3, ['breakfast', 'lunch', 'dinner'])
    - "1-0-1" = 2 times per day → (2, ['breakfast', 'dinner'])
    - "0-1-0" = 1 time per day → (1, ['lunch'])
    - "0-2-0" = 1 time per day (2 tablets at lunch) → (1, ['lunch'])
    - "0-0-1/2" = 1 time per day (half tablet at dinner) → (1, ['dinner'])
    
    Returns:
        Tuple of (times_per_day, meal_list) where meal_list indicates which meals
        Or None if no pattern found
    """
    import re
    # Match patterns like "1-1-1", "1-0-1", "0-2-0", "0-0-1/2" etc.
    # Allow for fractions like "1/2" or decimals
    pattern = re.search(r'\b([\d/]+)-([\d/]+)-([\d/]+)(?:-([\d/]+))?\b', frequency)
    if pattern:
        dose_strings = [d for d in pattern.groups() if d is not None]
        meals = ['breakfast', 'lunch', 'dinner', 'bedtime'][:len(dose_strings)]
        
        # Parse each dose (handle fractions and decimals)
        doses = []
        for d in dose_strings:
            if '/' in d:
                # Handle fractions like "1/2"
                parts = d.split('/')
                doses.append(float(parts[0]) / float(parts[1]) if len(parts) == 2 else 0)
            else:
                doses.append(float(d))
        
        # Build list of meals where dose > 0
        # Count is NUMBER OF MEALS (times per day), not total tablets
        meal_list = []
        for dose, meal in zip(doses, meals):
            if dose > 0:
                # Any non-zero dose means take medicine at that meal (once)
                # The dose value (1, 2, 1/2) indicates HOW MUCH, not HOW MANY TIMES
                meal_list.append(meal)
        
        times_per_day = len(meal_list)
        return (times_per_day, meal_list) if times_per_day > 0 else None
    return None


def calculate_medicine_timings(
    frequency: str,
    meal_times: MealTimes,
    timing_preference: str = "after_meal"
) -> List[str]:
    """
    Calculate optimal medicine timing based on frequency and meal schedule.
    
    Args:
        frequency: Medicine frequency (e.g., "twice a day", "three times a day", "1-1-1", "once daily")
        meal_times: User's meal schedule from profile
        timing_preference: "before_meal" (30 min before) or "after_meal" (30 min after)
    
    Returns:
        List of time strings in HH:MM format (24-hour)
    """
    frequency_lower = frequency.lower()
    
    # First, check for dose pattern notation (e.g., "1-1-1", "0-2-0")
    dose_pattern = parse_dose_pattern(frequency)
    if dose_pattern is not None:
        dose_count, meal_indicators = dose_pattern
        # Use the dose count to determine frequency
        if dose_count == 4:
            frequency_lower = "four times a day"
        elif dose_count == 3:
            frequency_lower = "three times a day"
        elif dose_count == 2:
            frequency_lower = "twice a day"
        elif dose_count == 1:
            frequency_lower = "once a day"
    
    # Parse meal times with fallbacks
    breakfast_time = (parse_time(meal_times.breakfast) if meal_times.breakfast else None) or time(8, 0)
    lunch_time = (parse_time(meal_times.lunch) if meal_times.lunch else None) or time(13, 0)
    dinner_time = (parse_time(meal_times.dinner) if meal_times.dinner else None) or time(20, 0)
    
    # Determine offset based on preference
    offset_minutes = -30 if timing_preference == "before_meal" else 30
    
    # Calculate timings based on frequency
    # IMPORTANT: Check more specific patterns FIRST to avoid false matches
    timings = []
    
    if "four times" in frequency_lower or ("4" in frequency_lower and "times" in frequency_lower):
        # Four times daily - spread throughout the day
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(lunch_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
        # Add bedtime dose (2 hours after dinner)
        timings.append(time_to_str(add_minutes_to_time(dinner_time, 120)))
    
    elif "three times" in frequency_lower or "thrice" in frequency_lower or ("3" in frequency_lower and "times" in frequency_lower):
        # Three times daily - after each meal
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(lunch_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    elif "twice" in frequency_lower or ("2" in frequency_lower and "times" in frequency_lower) or "two times" in frequency_lower:
        # Twice daily - morning and evening
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
        timings.append(time_to_str(add_minutes_to_time(dinner_time, offset_minutes)))
    
    elif "once" in frequency_lower or ("1" in frequency_lower and "time" in frequency_lower and "three" not in frequency_lower) or "daily" in frequency_lower:
        # Once daily - typically morning after breakfast
        timings.append(time_to_str(add_minutes_to_time(breakfast_time, offset_minutes)))
    
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
        # IMPORTANT: Check dose patterns FIRST (e.g., "1-1-1"), then text patterns
        expected_count = 2  # Default for "twice a day"
        
        # First, try to parse dose pattern notation (e.g., "1-1-1", "1-0-1")
        dose_pattern = parse_dose_pattern(frequency)
        if dose_pattern is not None:
            expected_count, meal_indicators = dose_pattern
        elif "four times" in frequency_lower or ("4" in frequency_lower and "times" in frequency_lower):
            expected_count = 4
        elif "three times" in frequency_lower or "thrice" in frequency_lower or ("3" in frequency_lower and "times" in frequency_lower):
            expected_count = 3
        elif "twice" in frequency_lower or ("2" in frequency_lower and "times" in frequency_lower):
            expected_count = 2
        elif "once" in frequency_lower or ("1" in frequency_lower and "time" in frequency_lower and "three" not in frequency_lower):
            expected_count = 1
        elif "every" in frequency_lower:
            # For "every X hours", calculate based on 24 hours
            import re
            match = re.search(r'every\s+(\d+)\s+hour', frequency_lower)
            if match:
                hours = int(match.group(1))
                expected_count = 24 // hours
        
        # Get current timing_times
        current_timings = medicine.get("timing_times", [])
        
        # ALWAYS recalculate timing_times for consistency with meal schedule
        # The AI-provided times might not align with user's actual meal times
        # We only skip if timing_times already has the CORRECT count AND matches expected pattern
        should_recalculate = True
        
        if current_timings and len(current_timings) == expected_count:
            # Times exist and count matches - but we still recalculate to align with meal schedule
            # This ensures consistency across all medicines
            should_recalculate = True  # Always recalculate for meal alignment
        
        if should_recalculate:
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


# Made with Bob