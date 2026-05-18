from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from services.stt_service import get_stt_service

router = APIRouter()


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(...)
):
    """
    Transcribe audio to text using Indic Conformer model.
    
    Args:
        audio: Audio file (WAV format recommended)
        language: Language name (hindi, kannada, bengali, etc.) - sent as form data
    
    Returns:
        JSON with transcribed text
    """
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Get STT service and transcribe
        stt_service = get_stt_service()
        transcription = stt_service.transcribe_audio(audio_data, language)
        
        return JSONResponse(content={
            "transcription": transcription,
            "language": language
        })
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


