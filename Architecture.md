
## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│                   http://localhost:5173                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Onboarding  │→ │    Upload    │→ │ Conversation │          │
│  │   (Profile)  │  │   Document   │  │     View     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                   │                 │
│         │                  │                   ↓                 │
│         │                  │          ┌─────────────────┐       │
│         │                  │          │  Lifestyle Q&A  │       │
│         │                  │          │ (No Document)   │       │
│         │                  │          └─────────────────┘       │
│         ↓                  ↓                   ↓                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         localStorage (Client-Side Storage)            │      │
│  │  • User Profile (name, age, conditions, allergies)    │      │
│  │  • Meal Times (breakfast, lunch, dinner)              │      │
│  │  • Monitoring Schedule (tests, due dates)             │      │
│  │  • Conversation History                               │      │
│  │  • Document Analysis Results                          │      │
│  │  • Google OAuth Token                                 │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │ REST API
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND (FastAPI + Python)                       │
│                   http://localhost:8000                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Routers                            │   │
│  │  • /api/process   - Document analysis with OCR           │   │
│  │  • /api/qa        - Document-based Q&A                   │   │
│  │  • /api/lifestyle - General health Q&A                   │   │
│  │  • /api/tts       - Text-to-speech synthesis             │   │
│  │  • /api/stt       - Speech-to-text transcription         │   │
│  │  • /api/calendar  - Google Calendar integration          │   │
│  │  • /api/profile   - User profile management              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Services Layer                         │   │
│  │                                                           │   │
│  │  OCR Service (LightOnOCR-2-1B)                            │   │
│  │  ├─ Medical document details extraction                   │   │
│  │  ├─ Lazy loading (on-demand)                              │   │
│  │                                                           │   │
│  │  Ollama Service (Gemma 4)                                 │   │
│  │  ├─ Document analysis with vision                         │   │
│  │  ├─ Profile context injection                             │   │
│  │  ├─ Language validation pass                              │   │
│  │  ├─ Automatic retry on JSON parse failure                 │   │
│  │  └─ Q&A with conversation history                         │   │
│  │                                                            │   │
│  │  Profile Service                                          │   │
│  │  ├─ Condition & allergy management                        │   │
│  │  ├─ Monitoring schedule generation                        │   │
│  │  ├─ Visit history tracking                                │   │
│  │  └─ Profile context prompt building                       │   │
│  │                                                            │   │
│  │  TTS Service (svara-TTS + SNAC)                           │   │
│  │  ├─ Lazy loading (first use)                              │   │
│  │  ├─ Persistent in-memory (fast subsequent)                │   │
│  │  ├─ MPS/CUDA/CPU support                                  │   │
│  │  └─ Consistent voice (fixed seed)                         │   │
│  │                                                            │   │
│  │  STT Service (Indic Conformer)                            │   │
│  │  ├─ Lazy loading (first use)                              │   │
│  │  ├─ 11 Indian languages                                   │   │
│  │  └─ Audio preprocessing (resampling, mono)                │   │
│  │                                                            │   │
│  │  Medicine Timing Service                                  │   │
│  │  ├─ Meal-based timing suggestions                         │   │
│  │  └─ Frequency-to-times conversion                         │   │
│  │                                                            │   │
│  │  Calendar Service (Google Calendar API)                   │   │
│  │  └─ Event creation with reminders                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────┬───────────────────────┬──────────────────────────┘
                │                       │
                ↓                       ↓
    ┌───────────────────┐   ┌──────────────────────┐
    │  Ollama (Local)   │   │  Google Calendar API │
    │  Gemma 4 Model    │   │  (OAuth 2.0)         │
    │  localhost:11434  │   │                      │
    └───────────────────┘   └──────────────────────┘
```

### Data Flow: Document Processing with Profile Integration

```
User uploads document
    ↓
Frontend → Backend (/api/process)
    ↓
[PDF] → pdfplumber extracts text + pdf2image rasterizes
[Image] → Detect if medical document
    ↓
[If medical] → Load LightOnOCR → Extract text → Unload model
    ↓
Load user profile from profile.json
    ↓
Build profile context prompt:
  - "Patient name: [name]"
  - "Active conditions: [conditions]"
  - "Known allergies: [allergies]"
  - "Meal times: breakfast [time], lunch [time], dinner [time]"
    ↓
Inject profile context into system prompt
    ↓
Send to Gemma 4 with:
  - System prompt (with profile context)
  - User prompt (with OCR text if available)
  - Images (always included)
    ↓
Gemma 4 analyzes with full context
    ↓
Language validation pass (ensure correct script)
    ↓
Parse JSON response (with automatic retry)
    ↓
Enhance medicine timings based on meal schedule
    ↓
Extract conditions & allergies from clinical context
    ↓
Merge into profile (deduplicate, update monitoring)
    ↓
Add visit record to profile
    ↓
Save updated profile
    ↓
Return analysis result to frontend
    ↓
Frontend stores in localStorage + displays
```

### Profile-Aware Q&A Flow

```
User asks question (document-based or lifestyle)
    ↓
Load user profile
    ↓
Build minimal profile context (name, conditions, allergies only)
    ↓
[Document Q&A] → Include clinical context + conversation history
[Lifestyle Q&A] → General health knowledge + profile context
    ↓
Send to Gemma 4 with profile-aware system prompt
    ↓
Gemma 4 generates personalized answer
    ↓
[Lifestyle] → Parse confidence level (HIGH/LOW)
    ↓
Language validation pass
    ↓
Return answer to frontend
    ↓
[LOW confidence] → Show "Consult Doctor" suggestion
```

---

## 📁 Project Structure

```
MedEase-Project/
├── README.md                          # This file
├── medease/
│   ├── backend/                       # Python FastAPI backend
│   │   ├── .env                       # Environment variables (create this)
│   │   ├── .env.example               # Environment template
│   │   ├── .venv/                     # Python virtual environment
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── requirements.txt           # Python dependencies
│   │   ├── profile.json               # User profile storage (auto-created)
│   │   │
│   │   ├── routers/                   # API route handlers
│   │   │   ├── process.py            # Document processing + OCR
│   │   │   ├── qa.py                 # Document-based Q&A
│   │   │   ├── lifestyle.py          # General health Q&A
│   │   │   ├── tts.py                # Text-to-speech
│   │   │   ├── stt.py                # Speech-to-text
│   │   │   ├── calendar.py           # Google Calendar
│   │   │   └── profile.py            # Profile management
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── ocr_service.py        # LightOnOCR integration
│   │   │   ├── pdf_service.py        # PDF processing
│   │   │   ├── ollama_service.py     # Gemma 4 AI calls
│   │   │   ├── tts_service.py        # TTS model handling
│   │   │   ├── stt_service.py        # STT model handling
│   │   │   ├── calendar_service.py   # Google Calendar API
│   │   │   ├── profile_service.py    # Profile CRUD + monitoring
│   │   │   └── medicine_timing_service.py  # Meal-based timing
│   │   │
│   │   ├── models/                    # Data models
│   │   │   └── schemas.py            # Pydantic schemas
│   │
│   ├── frontend/                      # React + Vite frontend
│   │   ├── .env.local                # Frontend environment (create this)
│   │   ├── package.json              # Node dependencies
│   │   ├── vite.config.ts            # Vite configuration
│   │   ├── tailwind.config.js        # Tailwind CSS config
│   │   ├── index.html                # HTML entry point
│   │   │
│   │   └── src/
│   │       ├── main.tsx              # React entry point
│   │       ├── App.tsx               # Root component with routing
│   │       ├── index.css             # Global styles
│   │       │
│   │       ├── components/           # React components
│   │       │   ├── OnboardingScreen.tsx      # User profile setup
│   │       │   ├── LanguageSelector.tsx      # Language picker
│   │       │   ├── UploadZone.tsx            # Document upload
│   │       │   ├── LoadingScreen.tsx         # Processing state
│   │       │   ├── ConversationView.tsx      # Main chat interface
│   │       │   ├── ChatBubble.tsx            # Message display
│   │       │   ├── ResponseOutputChoice.tsx  # Audio/Text choice
│   │       │   ├── VoiceInputButton.tsx      # Mic button
│   │       │   ├── AudioPlayer.tsx           # TTS playback
│   │       │   ├── EnhancedAudioControls.tsx # Audio controls
│   │       │   ├── CalendarModal.tsx         # Calendar integration
│   │       │   └── MonitoringModal.tsx       # Health monitoring
│   │       │
│   │       └── lib/                  # Utility libraries
│   │           ├── api.ts            # Backend API calls
│   │           ├── profileApi.ts     # Profile API calls
│   │           ├── tts.ts            # Text-to-speech logic
│   │           ├── stt.ts            # Speech-to-text logic
│   │           ├── Googleauth.ts     # Google OAuth
│   │           ├── labels.ts         # Multilingual labels
│   │           ├── storage.ts        # localStorage utilities
│   │           └── types.ts          # TypeScript types
│   │
-   └── GOOGLE_CALENDAR_SETUP.md      # Calendar setup guide

```

---
### Key Endpoints

#### Document Processing
```
POST /api/process/
- Upload and process medical document with OCR
- Accepts: multipart/form-data (file + language)
- Returns: Structured analysis with medicines, instructions
- Profile: Automatically updates conditions, allergies, monitoring
```

#### Question Answering
```
POST /api/qa/
- Ask follow-up questions about the document
- Body: { question, conversation_history, clinical_context, language }
- Returns: AI-generated answer with profile context
```

#### Lifestyle Q&A
```
POST /api/lifestyle/qa
- Ask general health questions without document
- Body: { question, language }
- Returns: { answer, suggested_cloud }
- Profile: Uses conditions and allergies for personalization
```

#### Profile Management
```
GET /api/profile/
- Get user profile
- Returns: Complete profile with conditions, monitoring, visits

POST /api/profile/
- Create or update user profile
- Body: HealthProfile object
- Returns: Saved profile

GET /api/profile/monitoring
- Get monitoring schedule
- Returns: List of tests with next due dates
```

#### Text-to-Speech
```
POST /api/tts/synthesize
- Convert text to speech audio
- Body: { text, language }
- Returns: Audio file (WAV format)
- Models: Lazy-loaded, persistent in memory
```

#### Speech-to-Text
```
POST /api/stt/transcribe
- Transcribe audio to text
- Accepts: multipart/form-data (audio file + language)
- Returns: Transcribed text
- Models: Lazy-loaded on first use
```

#### Google Calendar
```
POST /api/calendar/add-events
- Create calendar events for medicine reminders
- Body: { medicine_name, dosage, timing_times, duration_days, start_date, access_token }
- Returns: { success, events_created, message }
```
