# 🏥 MedEase - AI-Powered Medical Assistant for Elderly Users

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18.3-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com/)

> **Empowering elderly users to understand their medical documents, manage their health conditions, and get personalized health advice through AI-powered simplification, multilingual support, and voice interaction.**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

**MedEase** is a comprehensive localhost health assistant designed specifically for elderly users (60+) in India. It combines AI-powered document analysis with personalized health management to help users:

- **Understand medical documents** - Prescriptions, discharge summaries, lab reports
- **Manage health conditions** - Track chronic conditions and monitoring schedules
- **Get lifestyle advice** - Food, activity, and general health questions
- **Schedule medications** - Automatic Google Calendar integration
- **Interact naturally** - Voice input and audio output in multiple Indian languages

### Design Philosophy

The experience feels like a **warm, caring health companion** - not a clinical tool. The interface is:
- **Personalized** - Knows your name, conditions, and preferences
- **Conversational** - Natural language interaction
- **Accessible** - Large text, voice support, multilingual
- **Privacy-first** - All data stays on your device

---

## ✨ Key Features

### 🎯 Personalized Health Management

#### User Onboarding & Profiles
- **Name & Age Collection**: Personalized greetings and age-appropriate advice
- **Meal Schedule**: Breakfast, lunch, dinner times for medicine timing
- **Health Conditions**: Automatically extracted from documents and tracked
- **Allergies**: Tracked and considered in all recommendations
- **Visit History**: Complete record of all analyzed documents

#### Intelligent Health Monitoring
- **Condition-Based Monitoring**: Automatic test schedules based on conditions
  - Diabetes → Daily glucose, quarterly HbA1c, annual eye exam
  - Hypertension → Daily BP, semi-annual kidney function
  - 20+ conditions with evidence-based monitoring schedules
- **Next Due Dates**: Clear tracking of when tests are due
- **Monitoring Dashboard**: Visual overview of all health metrics

### 🤖 AI-Powered Document Analysis

#### Advanced OCR & Vision
- **LightOnOCR-2-1B**: Specialized OCR for handwritten prescriptions
- **Gemma 4 Vision**: Multimodal AI reads images and text together
- **Smart PDF Processing**: Extracts text when available, uses vision for scans
- **Medical Document Detection**: Automatically applies OCR for medical content

#### Intelligent Medicine Extraction
- **Exact Name Preservation**: Medicine names copied exactly from prescriptions
- **Meal-Based Timing**: Suggests medicine times based on your meal schedule
- **Duration Tracking**: Automatically calculates treatment duration
- **Warning Detection**: Identifies important precautions and side effects

#### Profile-Aware Analysis
- **Context Integration**: AI knows your existing conditions and allergies
- **Duplicate Detection**: Avoids re-adding known conditions
- **Interaction Checking**: Considers your current medications
- **Personalized Explanations**: Tailored to your health profile

### 🗣️ Voice & Audio Features

#### Text-to-Speech (TTS)
- **Backend TTS**: Indic TTS models (svara-TTS) for Hindi and Kannada
  - Natural-sounding voices
  - Gender selection (Male/Female)
  - Consistent voice across sessions
- **Browser TTS**: Web Speech API for English
- **Audio Controls**: Play, pause, stop, replay

#### Speech-to-Text (STT)
- **Backend STT**: Indic Conformer model for Indian languages
  - Supports 11 Indian languages
  - High accuracy for regional accents
- **Browser STT**: Web Speech API for English
- **Real-time Transcription**: See text as you speak

### 🌐 Multilingual Support

**Fully Supported Languages:**
- **English** (en-IN) - Browser TTS/STT
- **हिंदी / Hindi** (hi-IN) - Backend TTS/STT
- **ಕನ್ನಡ / Kannada** (kn-IN) - Backend TTS/STT

**Additional STT Support:**
- Bengali, Gujarati, Malayalam, Marathi, Nepali, Punjabi, Tamil, Telugu, Assamese

**Language Features:**
- All UI labels adapt to selected language
- AI responses in user's language
- Medical terms transliterated to native script
- Consistent language across all interactions

### 💬 Dual Q&A Modes

#### Document-Based Q&A
- Ask questions about your uploaded prescription/report
- AI uses clinical context from the document
- Maintains conversation history
- Provides accurate, document-specific answers

#### Lifestyle Q&A (No Document Required)
- General health questions without uploading documents
- Food safety questions ("Can I eat mangoes?")
- Activity guidance ("Is walking safe?")
- Medicine interaction queries
- **Confidence-Based Routing**: 
  - HIGH confidence → Answered locally
  - LOW confidence → Suggests consulting doctor

### 📅 Google Calendar Integration

- **OAuth 2.0 Authentication**: Secure Gmail-based sign-in
- **Automatic Reminders**: Creates events for all medicines
- **Smart Scheduling**: 
  - Multiple daily doses handled correctly
  - Duration-based event series
  - 15-minute events with 5-minute popup reminders
- **Timezone Support**: Asia/Kolkata timezone
- **Bulk Creation**: Add all medicines at once

### 💾 Session Management

- **localStorage Persistence**: All data survives page reloads
- **Profile Storage**: Health profile saved locally
- **Conversation History**: Complete chat history maintained
- **Document Cache**: Images cached for re-processing
- **Quota Handling**: Graceful degradation if storage full

---

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
│                            │                                      │
│                            ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Services Layer                         │   │
│  │                                                            │   │
│  │  OCR Service (LightOnOCR-2-1B)                            │   │
│  │  ├─ Medical document detection                            │   │
│  │  ├─ Lazy loading (on-demand)                              │   │
│  │  ├─ Immediate unload (memory efficient)                   │   │
│  │  └─ Handwriting-optimized extraction                      │   │
│  │                                                            │   │
│  │  Ollama Service (Gemma 4)                                 │   │
│  │  ├─ Document analysis with vision                         │   │
│  │  ├─ Profile context injection                             │   │
│  │  ├─ Language validation pass                              │   │
│  │  ├─ Automatic retry on JSON parse failure                 │   │
│  │  └─ Q&A with conversation history                         │   │
│  │                                                            │   │
│  │  Profile Service                                          │   │
│  │  ├─ Profile CRUD operations                               │   │
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
│  │  PDF Service (pdfplumber + pdf2image)                     │   │
│  │  ├─ Text extraction per page                              │   │
│  │  ├─ Image rasterization                                   │   │
│  │  └─ Scanned PDF detection                                 │   │
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

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.4.5 | Type safety |
| **Vite** | 5.2.12 | Build tool & dev server |
| **Tailwind CSS** | 3.4.4 | Styling framework |
| **Web Speech API** | Native | Browser TTS/STT for English |
| **Google Identity Services** | Latest | OAuth 2.0 authentication |
| **UUID** | 9.0.1 | Unique ID generation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Programming language |
| **FastAPI** | 0.111.0+ | Web framework |
| **Uvicorn** | 0.29.0+ | ASGI server |
| **pdfplumber** | 0.11.0+ | PDF text extraction |
| **pdf2image** | 1.17.0+ | PDF to image conversion |
| **Pillow** | 10.0.0+ | Image processing |
| **httpx** | 0.27.0+ | Async HTTP client |
| **python-dotenv** | Latest | Environment variables |
| **python-multipart** | 0.0.9+ | File upload handling |

### AI/ML Models
| Model | Purpose | Size | Loading |
|-------|---------|------|---------|
| **Gemma 4** (via Ollama) | Multimodal document understanding & Q&A | ~9GB | Always running |
| **LightOnOCR-2-1B** | OCR for handwritten prescriptions | ~4GB | Lazy (on-demand) |
| **Indic Conformer** | STT for Indian languages | ~600MB | Lazy (first use) |
| **svara-TTS** | TTS for Hindi/Kannada | ~500MB | Lazy (first use) |
| **SNAC** | Audio codec for TTS | ~50MB | With TTS |

### External Services
- **Ollama**: Local LLM inference server (localhost:11434)
- **Google Calendar API**: Calendar event creation
- **HuggingFace**: Model downloads

---

## 📦 Prerequisites

### Required Software

1. **Python 3.11 or higher**
   ```bash
   python --version  # Should show 3.11.x or higher
   ```
   Download from: https://www.python.org/downloads/

2. **Node.js 18 or higher** (includes npm)
   ```bash
   node --version  # Should show 18.x or higher
   npm --version
   ```
   Download from: https://nodejs.org/

3. **Ollama** (for running Gemma 4 locally)
   - Download from: https://ollama.ai/download
   - Install and ensure it's running

4. **Poppler** (for PDF processing)
   - **macOS**: `brew install poppler`
   - **Ubuntu/Debian**: `sudo apt-get install poppler-utils`
   - **Windows**: Download from https://github.com/oschwartz10612/poppler-windows/releases/

5. **Git** (for cloning the repository)
   ```bash
   git --version
   ```

### System Requirements

- **RAM**: Minimum 16GB (recommended 32GB for smooth operation)
- **Storage**: At least 20GB free space for models
- **GPU**: Optional but recommended (Apple Silicon MPS, NVIDIA CUDA, or CPU)
- **OS**: macOS, Linux, or Windows 10/11

### Optional

- **Google Account**: For calendar integration (optional feature)
- **HuggingFace Account**: For downloading Indic models (free)

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd MedEase-Project/medease
```

### Step 2: Backend Setup

#### 2.1 Create Python Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate
```

#### 2.2 Install Python Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install all required packages
pip install -r requirements.txt
```

**Note**: Installation may take 10-15 minutes.

#### 2.3 Set Up Ollama and Download Gemma 4

```bash
# Start Ollama (in a separate terminal)
ollama serve

# Pull the Gemma 4 model (~9GB download)
ollama pull gemma4:e4b

# Verify installation
ollama list
# Should show gemma4:e4b
```

#### 2.4 Get HuggingFace Token

1. Go to https://huggingface.co/
2. Sign up or log in
3. Go to **Settings** → **Access Tokens**
4. Click **New token** → Name it "MedEase" → Select **Read** permission
5. **Copy the token** (starts with `hf_...`)

#### 2.5 Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env  # or use your preferred editor
```

Add the following to your `.env` file:

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434

# HuggingFace Token (required for Indic models)
HUGGINGFACE_TOKEN=hf_your_actual_token_here

# Optional: Custom cache directory for models
HF_CACHE_DIR=/path/to/cache/directory

# Google OAuth (optional - for calendar integration)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Important**: Replace `hf_your_actual_token_here` with your actual HuggingFace token.

### Step 3: Frontend Setup

#### 3.1 Install Node Dependencies

```bash
# Navigate to frontend directory
cd ../frontend

# Install all npm packages
npm install
```

#### 3.2 Configure Frontend Environment

```bash
# Create environment file
touch .env.local

# Edit the file
nano .env.local
```

Add the following to `.env.local`:

```env
# Google OAuth Client ID (optional - for calendar integration)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 4: Google Calendar Setup (Optional)

See `medease/GOOGLE_CALENDAR_SETUP.md` for detailed instructions.

Quick steps:
1. Create Google Cloud Project
2. Enable Google Calendar API
3. Configure OAuth Consent Screen
4. Create OAuth Client ID
5. Add Client ID to `.env.local`

---

## ▶️ Running the Application

You need **three separate terminal windows**:

### Terminal 1: Start Ollama

```bash
ollama serve

# Keep this terminal running
# You should see: "Ollama is running"
```

### Terminal 2: Start Backend Server

```bash
cd medease/backend

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# OR
.venv\Scripts\activate  # Windows

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 3: Start Frontend Dev Server

```bash
cd medease/frontend

# Start Vite dev server
npm run dev

# You should see:
# ➜  Local:   http://localhost:5173/
```

### Verify Everything is Running

1. **Frontend**: http://localhost:5173 - Should show onboarding screen
2. **Backend API Docs**: http://localhost:8000/docs - Should show FastAPI Swagger UI
3. **Ollama**: http://localhost:11434 - Should show "Ollama is running"

---

## 📖 Usage Guide

### First Time Setup (Onboarding)

1. **Enter Your Name**
   - The app will greet you by name throughout

2. **Enter Your Age**
   - Used for age-appropriate health advice

3. **Set Meal Times** (Optional but Recommended)
   - Breakfast time (e.g., 08:00)
   - Lunch time (e.g., 13:00)
   - Dinner time (e.g., 20:00)
   - Used to suggest medicine timings

### Using the Application

#### Option 1: Upload a Medical Document

1. **Select Language** (English, Hindi, or Kannada)
2. **Upload Document**:
   - Drag & drop or click to browse
   - Supported: PDF, JPEG, PNG
   - Examples: Prescription, discharge summary, lab report
3. **Wait for Processing** (10-60 seconds)
4. **View Results**:
   - Simplified explanation
   - Medicine list with timings
   - Important instructions
   - Warnings and precautions

#### Option 2: Ask General Health Questions

1. **Click "Skip to Questions"** on upload screen
2. **Ask Anything**:
   - "Can I eat bananas if I have diabetes?"
   - "Is 30 minutes of walking safe?"
   - "What foods should I avoid?"
3. **Get Personalized Answers** based on your profile

### Interacting with the App

#### Text Input
- Type your question in the input field
- Click "Send" or press Enter

#### Voice Input
1. Click the microphone button
2. Speak your question clearly
3. Text appears automatically
4. Click "Send"

#### Audio Output
1. Choose "Audio" when asked for output preference
2. Listen to the response
3. Use controls to play/pause/stop/replay

#### Ask Follow-Up Questions
- About medicines: "What is this medicine for?"
- About dosage: "How many times should I take this?"
- About side effects: "What should I watch out for?"
- About lifestyle: "Can I exercise while taking this?"

### Adding to Google Calendar

1. **Connect Calendar**:
   - Click "📅 Connect Google Calendar"
   - Sign in with Gmail
   - Grant calendar access

2. **Add Reminders**:
   - Click "📅 Add Reminders"
   - Review medicines and timings
   - Edit times if needed
   - Select start date
   - Click "Add to My Calendar"

3. **Check Your Calendar**:
   - Open Google Calendar
   - See all medicine reminders
   - Get popup notifications

### Viewing Your Health Profile

- **Conditions**: Automatically tracked from documents
- **Allergies**: Extracted and remembered
- **Monitoring Schedule**: Tests you need to do
- **Visit History**: All analyzed documents

### Starting a New Document

- Click "New Document" button
- Previous conversation is saved
- Upload a new document or ask new questions

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
│   │   │
│   │   ├── model_cache/              # Cached AI models
│   │   │   └── lightonocr/           # OCR model cache
│   │   │
│   │   ├── temp_audio/               # Temporary audio files
│   │   │
│   │   └── Documentation/
│   │       ├── STT_SETUP.md          # Speech-to-text setup
│   │       ├── OCR_INTEGRATION.md    # OCR integration details
│   │       └── TTS_INTEGRATION.md    # Text-to-speech setup
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
│   └── GOOGLE_CALENDAR_SETUP.md      # Calendar setup guide
│
└── Documentation/
    ├── MedEase_Phase1_Spec_v2.6.md   # Original product spec
    └── medease_personalisation_spec.md  # Personalization features
```

---

## 📚 API Documentation

Once the backend is running, access interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

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

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Ollama Connection Error

**Error**: `Failed to connect to Ollama`

**Solutions**:
- Ensure Ollama is running: `ollama serve`
- Check if port 11434 is available: `lsof -i :11434`
- Verify Gemma 4 is installed: `ollama list`
- Try pulling the model: `ollama pull gemma4:e4b`

#### 2. HuggingFace Model Download Fails

**Error**: `401 Unauthorized` or `Repository not found`

**Solutions**:
- Verify your HuggingFace token in `.env`
- Check token has "Read" permission
- Ensure you're logged in: `huggingface-cli login`
- Request access to gated models if needed

#### 3. Profile Not Saving

**Error**: Profile data lost after restart

**Solutions**:
- Check `backend/profile.json` exists and is writable
- Verify backend has write permissions in its directory
- Check browser localStorage is not full
- Clear browser cache and try again

#### 4. OCR Not Working

**Error**: Medicine names incorrect or missing

**Solutions**:
- Ensure HuggingFace token is set
- Check model cache directory has space
- Try uploading a clearer image
- Verify image is actually a medical document

#### 5. TTS/STT Models Loading Slowly

**Issue**: First request takes 1-2 minutes

**This is normal!** Models are lazy-loaded:
- LightOnOCR: ~30 seconds (only for medical images)
- Indic TTS: ~20 seconds (first audio request)
- Indic STT: ~40 seconds (first voice input)
- Subsequent requests are fast (models stay in memory)

#### 6. Voice Input Not Working

**Error**: Microphone button doesn't respond

**Solutions**:
- Grant microphone permissions in browser
- Check browser console for errors
- Ensure you're using HTTPS or localhost
- Try a different browser (Chrome/Edge recommended)
- For Indian languages, ensure backend is running

#### 7. Calendar Integration Fails

**Error**: `invalid_client` or `Access blocked`

**Solutions**:
- Verify Client ID is correct in `.env.local`
- Check OAuth consent screen is configured
- Add your email as a test user
- Ensure authorized origins include `http://localhost:5173`
- See `GOOGLE_CALENDAR_SETUP.md` for detailed steps

#### 8. Out of Memory Errors

**Error**: System freezes or crashes

**Solutions**:
- Close other applications
- Restart Ollama: `ollama serve`
- Use CPU instead of GPU (slower but uses less memory)
- Increase system swap space
- Consider using a machine with more RAM

#### 9. Language Not Switching

**Error**: UI still in English after selecting Hindi/Kannada

**Solutions**:
- Refresh the page
- Clear browser cache
- Check localStorage for `medease_language` key
- Verify language selector is working

#### 10. Monitoring Schedule Not Showing

**Error**: No tests in monitoring dashboard

**Solutions**:
- Upload a document with a diagnosed condition
- Check profile.json has conditions listed
- Verify condition name matches monitoring cadence table
- Try re-uploading the document

### Getting Help

If you encounter issues not listed here:

1. **Check logs**:
   - Backend: Terminal running uvicorn
   - Frontend: Browser console (F12)
   - Ollama: Terminal running ollama serve

2. **Search documentation**:
   - `STT_SETUP.md` for speech-to-text issues
   - `OCR_INTEGRATION.md` for OCR problems
   - `GOOGLE_CALENDAR_SETUP.md` for calendar issues

3. **Common debugging commands**:
   ```bash
   # Check if services are running
   curl http://localhost:11434  # Ollama
   curl http://localhost:8000/docs  # Backend
   
   # Check Python environment
   pip list | grep torch
   pip list | grep transformers
   
   # Check profile
   cat backend/profile.json
   ```

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Ollama** for local LLM inference
- **Google** for Gemma 4 model and Calendar API
- **HuggingFace** for hosting Indic models
- **LightOn AI** for LightOnOCR model
- **AI4Bharat** for Indic Conformer STT model
- **Kenpath** for svara-TTS model
- **FastAPI** and **React** communities

---

## 🎯 Project Goals

This project was built with the following goals:

- **Accessibility**: Making healthcare information accessible to elderly users
- **Multilingual**: Supporting Indian languages beyond English
- **Privacy**: All processing happens locally, no cloud dependencies
- **Personalization**: Remembering user context for better advice
- **User-Friendly**: Voice interaction and audio output for low-tech-literacy users

**Key Innovations**:
- Profile-aware AI that knows your health history
- Automatic health monitoring schedule generation
- Meal-based medicine timing suggestions
- Confidence-based routing for complex questions
- Lazy-loaded models for memory efficiency

---

Made with ❤️ for elderly users who deserve better access to healthcare information.
