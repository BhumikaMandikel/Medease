import type { AnalysisResult, ChatMessage, Language } from './types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

export async function processDocument(
  file: File,
  language: Language
): Promise<AnalysisResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('language', language);

  const res = await fetch(`${BACKEND_URL}/api/process/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    let detail = 'An unexpected error occurred.';
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return res.json() as Promise<AnalysisResult>;
}

export async function askQuestion(params: {
  question: string;
  conversation_history: { role: string; content: string }[];
  clinical_context: string;
  narrative_explanation: string;
  language: Language;
}): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/qa/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let detail = 'Could not get an answer. Please try again.';
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return data.answer as string;
}

export async function addCalendarEvents(params: {
  medicine_name: string;
  dosage: string;
  timing_times: string[];
  duration_days: number;
  start_date: string;
  access_token: string;
  timezone?: string;
}): Promise<{ success: boolean; events_created: number; message: string }> {
  const res = await fetch(`${BACKEND_URL}/api/calendar/add-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let detail = 'Could not add calendar events.';
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function askLifestyleQuestion(params: {
  question: string;
  language: Language;
}): Promise<{ answer: string; suggested_cloud: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/lifestyle/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let detail = 'Could not get an answer. Please try again.';
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return res.json();
}