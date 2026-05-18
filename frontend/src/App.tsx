import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { AnalysisResult, AppPhase, ChatMessage, Language, OutputMode, HealthProfile } from './lib/types';
import { KEYS, storageGet, storageSet, clearDocumentKeys, setQuotaCallback } from './lib/storage';
import { processDocument } from './lib/api';
import { getGoogleToken } from './lib/Googleauth';
import { stopSpeaking } from './lib/tts';
import { fetchProfile } from './lib/profileApi';

import LanguageSelector from './components/LanguageSelector';
import UploadZone from './components/UploadZone';
import LoadingScreen from './components/LoadingScreen';
import ConversationView from './components/ConversationView';
import OnboardingScreen from './components/OnboardingScreen';

export default function App() {
  // ── Core state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AppPhase>('upload');
  const [language, setLanguage] = useState<Language>('english');
  const [outputMode, setOutputMode] = useState<OutputMode>('text'); // Default to 'text' mode
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Processing
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Conversation
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documentName, setDocumentName] = useState('');

  // UI
  const [quotaBanner, setQuotaBanner] = useState(false);

  // ── On mount: load profile and restore session from localStorage ──────
  useEffect(() => {
    async function initialize() {
      // Register quota exceeded callback
      setQuotaCallback(() => setQuotaBanner(true));

      // Load profile first
      const loadedProfile = await fetchProfile();
      setProfile(loadedProfile);
      setProfileLoading(false);

      // Check if onboarding is needed
      if (!loadedProfile || !loadedProfile.name) {
        setPhase('onboarding');
        return;
      }

      // Language preference - use profile language if available
      const savedLang = storageGet(KEYS.LANGUAGE) as Language | null;
      if (savedLang) {
        setLanguage(savedLang);
      } else if (loadedProfile.preferred_language) {
        setLanguage(loadedProfile.preferred_language as Language);
      }

      // Output mode preference
      const savedMode = storageGet(KEYS.OUTPUT_MODE) as OutputMode | null;
      if (savedMode) setOutputMode(savedMode);

      // Google token
      const token = getGoogleToken();
      if (token) setGoogleToken(token);

      // Session restore — if we have a saved conversation, jump straight to it
      const savedPhase = storageGet(KEYS.PHASE);
      const savedResult = storageGet(KEYS.ANALYSIS_RESULT);
      const savedMessages = storageGet(KEYS.MESSAGES);
      const savedDocName = storageGet(KEYS.DOCUMENT_NAME);

      if (savedPhase === 'conversation' && savedResult) {
        try {
          const result = JSON.parse(savedResult) as AnalysisResult;
          const msgs = savedMessages ? (JSON.parse(savedMessages) as ChatMessage[]) : [];
          setAnalysisResult(result);
          setMessages(msgs);
          setDocumentName(savedDocName ?? '');
          setPhase('conversation');
          return;
        } catch {
          // Corrupt data — fall through to upload
        }
      }

      setPhase('upload');
    }

    initialize();
  }, []);

  // ── Process document ─────────────────────────────────────────────────
  async function handleProcessFile(file: File) {
    setPendingFile(file);
    setProcessingError(null);
    setPhase('processing');
    storageSet(KEYS.PHASE, 'processing');
    storageSet(KEYS.DOCUMENT_NAME, file.name);
    setDocumentName(file.name);

    // Store document data for images (not PDFs — too large)
    if (file.type !== 'application/pdf') {
      const base64 = await fileToBase64(file);
      storageSet(KEYS.DOCUMENT_DATA, base64);
      storageSet(KEYS.DOCUMENT_TYPE, 'image');
    } else {
      storageSet(KEYS.DOCUMENT_TYPE, 'pdf');
    }

    try {
      const result = await processDocument(file, language);

      // Refresh profile after document processing (conditions/monitoring may have been added)
      const updatedProfile = await fetchProfile();
      setProfile(updatedProfile);

      // Build initial assistant message from narrative
      const initialMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: result.narrative_explanation,
        timestamp: new Date().toISOString(),
        isInitialSummary: true,
      };

      const initMessages = [initialMsg];

      // Persist to localStorage
      storageSet(KEYS.ANALYSIS_RESULT, JSON.stringify(result));
      storageSet(KEYS.MESSAGES, JSON.stringify(initMessages));
      storageSet(KEYS.PHASE, 'conversation');

      setAnalysisResult(result);
      setMessages(initMessages);
      setPhase('conversation');
    } catch (e: any) {
      setProcessingError(e.message ?? 'An unexpected error occurred. Please try again.');
    }
  }

  function handleGoBackFromError() {
    setProcessingError(null);
    setPendingFile(null);
    setPhase('upload');
    storageSet(KEYS.PHASE, 'upload');
  }

  // ── Skip to questions (no document) ───────────────────────────────────
  function handleSkipToQuestions() {
    stopSpeaking();
    clearDocumentKeys();
    
    // Create a minimal analysis result for lifestyle Q&A mode
    const lifestyleResult: AnalysisResult = {
      medicines: [],
      narrative_explanation: '',
      clinical_context: '',
      was_scanned_pdf: false,
    };
    
    setAnalysisResult(lifestyleResult);
    setMessages([]);
    setDocumentName('General Health Questions');
    setPendingFile(null);
    setProcessingError(null);
    
    // Persist to localStorage
    storageSet(KEYS.ANALYSIS_RESULT, JSON.stringify(lifestyleResult));
    storageSet(KEYS.MESSAGES, JSON.stringify([]));
    storageSet(KEYS.DOCUMENT_NAME, 'General Health Questions');
    storageSet(KEYS.PHASE, 'conversation');
    
    setPhase('conversation');
  }

  // ── New document ──────────────────────────────────────────────────────
  function handleNewDocument() {
    stopSpeaking();
    clearDocumentKeys();
    setAnalysisResult(null);
    setMessages([]);
    setDocumentName('');
    setPendingFile(null);
    setProcessingError(null);
    setPhase('upload');
  }

  // ── Language change mid-conversation ──────────────────────────────────
  function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    storageSet(KEYS.LANGUAGE, lang);

    // If in conversation: for images we can re-process, for PDFs we can't
    // (File object is gone after refresh). We show a notice via the
    // re-process prompt only when in conversation — handled inline here with
    // a simple confirm dialog. Skipped for now per spec (edge case 10).
  }

  // ── Google token ──────────────────────────────────────────────────────
  function handleGoogleConnect(token: string) {
    setGoogleToken(token);
  }

  function handleGoogleDisconnect() {
    setGoogleToken(null);
  }

  // ── Messages update (from ConversationView) ───────────────────────────
  function handleMessagesUpdate(msgs: ChatMessage[]) {
    setMessages(msgs);
  }

  // ── Output mode ───────────────────────────────────────────────────────
  function handleOutputModeChange(mode: OutputMode) {
    setOutputMode(mode);
    storageSet(KEYS.OUTPUT_MODE, mode);
  }

  // ── Onboarding completion ─────────────────────────────────────────────
  async function handleOnboardingComplete() {
    // Reload profile after onboarding
    const loadedProfile = await fetchProfile();
    setProfile(loadedProfile);
    setPhase('upload');
  }

  // ── Render ────────────────────────────────────────────────────────────
  // Show loading while profile is being fetched
  if (profileLoading) {
    return null; // Or a simple loading spinner
  }

  if (phase === 'onboarding') {
    return (
      <OnboardingScreen
        language={language}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (phase === 'upload') {
    return (
      <>
        {quotaBanner && <QuotaBanner onDismiss={() => setQuotaBanner(false)} />}
        <UploadZone
          language={language}
          languageSelectorSlot={
            <LanguageSelector selected={language} onChange={handleLanguageChange} />
          }
          googleToken={googleToken}
          onGoogleConnect={handleGoogleConnect}
          onGoogleDisconnect={handleGoogleDisconnect}
          onProcess={handleProcessFile}
          onSkipToQuestions={handleSkipToQuestions}
        />
      </>
    );
  }

  if (phase === 'processing') {
    return (
      <>
        {quotaBanner && <QuotaBanner onDismiss={() => setQuotaBanner(false)} />}
        <LoadingScreen
          language={language}
          error={processingError}
          onGoBack={handleGoBackFromError}
        />
      </>
    );
  }

  // phase === 'conversation'
  if (!analysisResult) {
    // Safety fallback — shouldn't happen
    handleNewDocument();
    return null;
  }

  return (
    <>
      {quotaBanner && <QuotaBanner onDismiss={() => setQuotaBanner(false)} />}
      <ConversationView
        language={language}
        onLanguageChange={handleLanguageChange}
        analysisResult={analysisResult}
        messages={messages}
        onMessagesUpdate={handleMessagesUpdate}
        outputMode={outputMode}
        onOutputModeChange={handleOutputModeChange}
        googleToken={googleToken}
        onGoogleConnect={handleGoogleConnect}
        onGoogleDisconnect={handleGoogleDisconnect}
        documentName={documentName}
        onNewDocument={handleNewDocument}
        profile={profile}
      />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix, keep only base64 part
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function QuotaBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#FFF8E1', borderBottom: '1px solid #F59E0B', padding: '10px 24px', fontSize: 16, color: '#92400E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>⚠️ Your session could not be saved. Please avoid closing this tab.</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#92400E', lineHeight: 1 }}>×</button>
    </div>
  );
}
