export type Language = 'english' | 'hindi' | 'kannada' | 'bengali' | 'marathi' | 'telugu' | 'assamese' | 'gujarati' | 'malayalam' | 'punjabi' | 'tamil' | 'nepali';

export type AppPhase = 'onboarding' | 'upload' | 'processing' | 'conversation';

export type OutputMode = 'audio' | 'text';

export type MessageRole = 'user' | 'assistant';

export type AudioState = 'idle' | 'generating' | 'ready' | 'playing' | 'paused';

export interface ChatMessage {
  id: string;               // uuid — used as React key
  role: MessageRole;
  content: string;          // Plain text of the message
  timestamp: string;        // ISO string
  isInitialSummary?: boolean;
  audioState?: AudioState;  // Track audio generation/playback state
  audioUrl?: string;        // Cached audio URL
}

export interface Medicine {
  name: string;
  simple_name: string;
  reason: string;
  dosage: string;
  frequency: string;
  duration_days: number;    // 0 if not mentioned
  timing_times: string[];   // 24-hour format e.g. ["08:00","21:00"]
  warnings: string[];
}

export interface AnalysisResult {
  medicines: Medicine[];
  narrative_explanation: string;
  clinical_context: string;
  was_scanned_pdf: boolean;
}

export interface CalendarEventRequest {
  medicine_name: string;
  dosage: string;
  timing_times: string[];
  duration_days: number;
  start_date: string;       // ISO: "2026-04-25"
  access_token: string;
}

// UI labels per language
export interface UILabels {
  uploadTitle: string;
  uploadSubtitle: string;
  dropzone: string;
  dropzoneHint: string;
  processButton: string;
  connectCalendar: string;
  calendarConnected: string;
  processingMsg1: string;
  processingMsg2: string;
  processingMsg3: string;
  processingWait: string;
  listenButton: string;
  readButton: string;
  pauseButton: string;
  stopButton: string;
  resumeButton: string;
  askPlaceholder: string;
  sendButton: string;
  addReminders: string;
  newDocument: string;
  greetingPrefix: string;
  generatingAudio: string;
  audioGenerationComplete: string;
  playAudioButton: string;
  replayAudioButton: string;
  downloadAudioButton: string;
  audioDownloaded: string;
}

// Profile types
export interface ConditionEntry {
  name: string;
  simple_name: string;
  status: 'active' | 'recurring' | 'resolved';
  first_noted: string;
  last_seen: string;
}

export interface AllergyEntry {
  substance: string;
  severity?: string;
  noted_date: string;
}

export interface MealTimes {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

export interface MonitoringEntry {
  test_name: string;
  for_condition: string;
  frequency_days: number;
  last_done?: string;
  next_due?: string;
}

export interface VisitEntry {
  date: string;
  conditions_seen: string[];
  medicines_seen: string[];
}

export interface HealthProfile {
  name: string;
  preferred_language: string;
  date_of_birth?: string;
  conditions: ConditionEntry[];
  allergies: AllergyEntry[];
  meal_times: MealTimes;
  monitoring: MonitoringEntry[];
  visits: VisitEntry[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ProfilePatchRequest {
  name?: string;
  preferred_language?: string;
  date_of_birth?: string;
  meal_times?: MealTimes;
}

export interface LifestyleQAResponse {
  answer: string;
  suggested_cloud: boolean;
}