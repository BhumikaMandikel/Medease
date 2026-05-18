from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import calendar, process, qa, tts, stt, profile, lifestyle

# Note: TTS and STT models are lazy-loaded on first use to save memory at startup
# They will load automatically when first requested and stay in memory for fast subsequent use

app = FastAPI(title="MedEase API", version="1.0.0")

# Allow the Vite dev server (5173) and any other local origin used during dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server (primary)
        "http://localhost:3000",  # fallback / alternate dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process.router, prefix="/api/process")
app.include_router(qa.router, prefix="/api/qa")
app.include_router(calendar.router, prefix="/api/calendar")
app.include_router(tts.router, prefix="/api/tts", tags=["tts"])
app.include_router(stt.router, prefix="/api/stt", tags=["stt"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(lifestyle.router, prefix="/api/lifestyle", tags=["lifestyle"])