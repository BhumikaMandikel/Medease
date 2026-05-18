// Hybrid TTS: Browser TTS for English, Backend TTS for Indian languages
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// Browser TTS voice locale per language
const VOICE_LOCALE: Record<string, string> = {
  english: 'en-IN',
  hindi: 'hi-IN',
  kannada: 'kn-IN',
};

// Audio cache: stores generated audio URLs by text hash
const audioCache = new Map<string, string>();

// Track current audio playback
let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isCurrentlyPlaying = false;
let isCurrentlyPaused = false;
let isGenerating = false;
let currentMessageId: string | null = null;

export function isTTSSupported(): boolean {
  return true; // Both browser and backend TTS available
}

export function isGeneratingAudio(): boolean {
  return isGenerating;
}

/**
 * Simple hash function for caching
 */
function hashText(text: string, language: string): string {
  return `${language}:${text.substring(0, 100)}`;
}

/**
 * Generate speech from text using appropriate TTS method
 * - English: Browser TTS (fast, no memory)
 * - Hindi/Kannada: Backend TTS (high quality, cached)
 */
export async function speak(
  text: string,
  language: string,
  rate: number = 0.7,
  onEnd?: () => void,
  onPause?: () => void
): Promise<void> {
  try {
    // Stop any currently playing audio
    stopSpeaking();

    const lang = language.toLowerCase();

    // Use browser TTS for English (faster, no backend load)
    if (lang === 'english') {
      return speakWithBrowserTTS(text, language, rate, onEnd);
    }

    // Use backend TTS for Indian languages (Hindi, Kannada) with caching
    return await speakWithBackendTTS(text, language, onEnd);
  } catch (error) {
    console.error('TTS error:', error);
    isGenerating = false;
    isCurrentlyPlaying = false;
    onEnd?.();
    throw error;
  }
}

/**
 * Browser TTS for English (fast, lightweight)
 */
function speakWithBrowserTTS(
  text: string,
  language: string,
  rate: number = 0.7,
  onEnd?: () => void
): void {
  if (!('speechSynthesis' in window)) {
    throw new Error('Browser TTS not supported');
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = VOICE_LOCALE[language] ?? 'en-IN';
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
    currentUtterance = null;
    isCurrentlyPlaying = false;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    isCurrentlyPlaying = false;
    onEnd?.();
  };

  currentUtterance = utterance;
  isCurrentlyPlaying = true;
  window.speechSynthesis.speak(utterance);
}

/**
 * Backend TTS for Indian languages (Hindi, Kannada) with caching
 */
async function speakWithBackendTTS(
  text: string,
  language: string,
  onEnd?: () => void
): Promise<void> {
  const cacheKey = hashText(text, language);
  
  // Check if audio is already cached
  let audioUrl = audioCache.get(cacheKey);
  
  if (!audioUrl) {
    // Generate new audio
    isGenerating = true;

    const response = await fetch(`${BACKEND_URL}/api/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        gender: 'Female',
      }),
    });

    isGenerating = false;

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate speech');
    }

    // Get audio blob and cache it
    const audioBlob = await response.blob();
    audioUrl = URL.createObjectURL(audioBlob);
    audioCache.set(cacheKey, audioUrl);
  }

  // Create and play audio element
  currentAudio = new Audio(audioUrl);
  isCurrentlyPlaying = true;
  isCurrentlyPaused = false;

  currentAudio.onended = () => {
    isCurrentlyPlaying = false;
    isCurrentlyPaused = false;
    currentAudio = null;
    onEnd?.();
  };

  currentAudio.onerror = () => {
    isCurrentlyPlaying = false;
    isCurrentlyPaused = false;
    currentAudio = null;
    onEnd?.();
  };

  await currentAudio.play();
}

export function pauseSpeaking(): void {
  if (currentAudio && isCurrentlyPlaying && !isCurrentlyPaused) {
    currentAudio.pause();
    isCurrentlyPaused = true;
  } else if (currentUtterance && 'speechSynthesis' in window) {
    window.speechSynthesis.pause();
    isCurrentlyPaused = true;
  }
}

export function resumeSpeaking(): void {
  if (currentAudio && isCurrentlyPaused) {
    currentAudio.play();
    isCurrentlyPaused = false;
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
    isCurrentlyPaused = false;
  }
}

export function stopSpeaking(): void {
  // Stop backend audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // Stop browser TTS
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  isCurrentlyPlaying = false;
  isCurrentlyPaused = false;
  isGenerating = false;
}

export function isSpeaking(): boolean {
  return isCurrentlyPlaying && !isCurrentlyPaused;
}

export function isPaused(): boolean {
  return isCurrentlyPaused;
}

/**
 * Check if backend TTS service is ready (for Indian languages)
 */
export async function checkTTSHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tts/health`);
    const data = await response.json();
    return data.status === 'ready' || data.status === 'loading';
  } catch (error) {
    console.error('TTS health check failed:', error);
    return false;
  }
}

/**
 * Generate audio without playing it (for manual control)
 * Returns the audio URL for later playback
 */
export async function generateAudio(
  text: string,
  language: string,
  messageId?: string
): Promise<string> {
  const lang = language.toLowerCase();
  const cacheKey = hashText(text, language);
  
  // Check if audio is already cached
  let audioUrl = audioCache.get(cacheKey);
  
  if (audioUrl) {
    return audioUrl;
  }

  // For English, we can't pre-generate with browser TTS, return empty
  if (lang === 'english') {
    return '';
  }

  // Generate new audio for Indian languages
  isGenerating = true;
  currentMessageId = messageId || null;

  try {
    const response = await fetch(`${BACKEND_URL}/api/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        gender: 'Female',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate speech');
    }

    // Get audio blob and cache it
    const audioBlob = await response.blob();
    audioUrl = URL.createObjectURL(audioBlob);
    audioCache.set(cacheKey, audioUrl);
    
    return audioUrl;
  } finally {
    isGenerating = false;
    currentMessageId = null;
  }
}

/**
 * Play audio from a pre-generated URL or generate on-the-fly
 */
export async function playAudio(
  audioUrl: string,
  text: string,
  language: string,
  messageId?: string,
  onEnd?: () => void
): Promise<void> {
  try {
    stopSpeaking();
    currentMessageId = messageId || null;

    const lang = language.toLowerCase();

    // For English or if no audioUrl, use browser TTS
    if (lang === 'english' || !audioUrl) {
      return speakWithBrowserTTS(text, language, 0.7, onEnd);
    }

    // Play from cached URL
    currentAudio = new Audio(audioUrl);
    isCurrentlyPlaying = true;
    isCurrentlyPaused = false;

    currentAudio.onended = () => {
      isCurrentlyPlaying = false;
      isCurrentlyPaused = false;
      currentAudio = null;
      currentMessageId = null;
      onEnd?.();
    };

    currentAudio.onerror = () => {
      isCurrentlyPlaying = false;
      isCurrentlyPaused = false;
      currentAudio = null;
      currentMessageId = null;
      onEnd?.();
    };

    await currentAudio.play();
  } catch (error) {
    console.error('Audio playback error:', error);
    isCurrentlyPlaying = false;
    currentMessageId = null;
    onEnd?.();
    throw error;
  }
}

/**
 * Replay audio from the beginning
 */
export function replayAudio(): void {
  if (currentAudio) {
    currentAudio.currentTime = 0;
    if (isCurrentlyPaused) {
      currentAudio.play();
      isCurrentlyPaused = false;
    }
  } else if (currentUtterance && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(currentUtterance);
  }
}

/**
 * Download audio file
 */
export function downloadAudio(audioUrl: string, filename: string = 'audio.wav'): void {
  if (!audioUrl) return;
  
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get current playing message ID
 */
export function getCurrentMessageId(): string | null {
  return currentMessageId;
}

/**
 * Clear audio cache (useful for memory management)
 */
export function clearAudioCache(): void {
  audioCache.forEach(url => URL.revokeObjectURL(url));
  audioCache.clear();
}


