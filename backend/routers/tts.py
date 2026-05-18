import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services.tts_service import generate_speech, are_models_loaded

router = APIRouter()

# Directory to store temporary audio files
AUDIO_DIR = Path("temp_audio")
AUDIO_DIR.mkdir(exist_ok=True)


class TTSRequest(BaseModel):
    text: str
    language: str  # 'english', 'hindi', 'kannada'
    gender: str = "Female"  # 'Male' or 'Female'


@router.post("/generate")
async def generate_tts(request: TTSRequest):
    """
    Generate speech from text and return audio file.
    Only supports Hindi and Kannada (English uses browser TTS).
    Models are lazy-loaded on first request.
    
    Args:
        text: The text to convert to speech
        language: Language code ('hindi', 'kannada')
        gender: Voice gender ('Male' or 'Female')
    
    Returns:
        Audio file (WAV format)
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Only support Indian languages (English uses browser TTS)
    valid_languages = ["hindi", "kannada","bengali","marathi","telugu","assamese","gujarati",
    "malayalam","punjabi","tamil","nepali"]
    if request.language.lower() not in valid_languages:
        raise HTTPException(
            status_code=400,
            detail=f"Backend TTS only supports: {', '.join(valid_languages)}. Use browser TTS for English."
        )
    
    # Validate gender
    valid_genders = ["Male", "Female"]
    if request.gender not in valid_genders:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gender. Must be one of: {', '.join(valid_genders)}"
        )
    
    try:
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = AUDIO_DIR / f"{audio_id}.wav"
        
        # Generate speech (models will be lazy-loaded if needed)
        generate_speech(
            text=request.text,
            language=request.language,
            output_path=str(output_path),
            gender=request.gender
        )
        
        # Return audio file
        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=f"speech_{audio_id}.wav",
            background=None  # Keep file until response is sent
        )
    
    except ValueError as e:
        # Language not supported
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"TTS generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )


@router.get("/health")
async def tts_health():
    """Check if TTS service is ready."""
    return {
        "status": "ready" if are_models_loaded() else "loading",
        "models_loaded": are_models_loaded()
    }

