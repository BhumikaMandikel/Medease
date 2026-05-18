
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
