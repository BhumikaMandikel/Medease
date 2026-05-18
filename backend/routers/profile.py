from fastapi import APIRouter, HTTPException
from models.schemas import HealthProfile, ProfilePatchRequest
from services.profile_service import (
    load_profile, 
    save_profile, 
    mark_monitoring_done
)

router = APIRouter()


@router.get("/", response_model=HealthProfile)
async def get_profile():
    """Load and return the health profile."""
    try:
        profile = load_profile()
        return profile
    except Exception as e:
        # Return blank profile on error
        return HealthProfile()


@router.get("/exists")
async def check_profile_exists():
    """Check if a profile exists with a name set."""
    try:
        profile = load_profile()
        exists = bool(profile.name and profile.name.strip())
        return {"exists": exists}
    except Exception:
        return {"exists": False}


@router.post("/", response_model=HealthProfile)
async def create_profile(profile: HealthProfile):
    """Create or fully replace the profile."""
    try:
        save_profile(profile)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(e)}")


@router.patch("/", response_model=HealthProfile)
async def update_profile(patch: ProfilePatchRequest):
    """Merge partial updates into the profile."""
    try:
        profile = load_profile()
        
        # Apply patches
        if patch.name is not None:
            profile.name = patch.name
        if patch.preferred_language is not None:
            profile.preferred_language = patch.preferred_language
        if patch.date_of_birth is not None:
            profile.date_of_birth = patch.date_of_birth
        if patch.meal_times is not None:
            profile.meal_times = patch.meal_times
        
        save_profile(profile)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.patch("/monitoring/{test_name}/done")
async def mark_test_done(test_name: str):
    """Mark a monitoring test as done and update next_due."""
    try:
        profile = load_profile()
        success = mark_monitoring_done(profile, test_name)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Monitoring test '{test_name}' not found")
        
        save_profile(profile)
        return {"success": True, "message": f"Marked {test_name} as done"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark test as done: {str(e)}")

