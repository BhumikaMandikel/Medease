const STT_LOCALE: Record<string, string> = {
  english: 'en-IN',
  hindi: 'hi-IN',
  kannada: 'kn-IN',
};

// Languages that require backend STT (Indic Conformer model)
const BACKEND_STT_LANGUAGES = [
  'hindi', 'kannada', 'bengali', 'marathi', 'telugu',
  'assamese', 'gujarati', 'malayalam', 'punjabi', 'tamil', 'nepali'
];

export function isSTTSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

export function startListening(
  language: string,
  onResult: (transcript: string) => void,
  onError: () => void
): () => void {
  // Use backend STT for Indic languages (except English)
  if (BACKEND_STT_LANGUAGES.includes(language)) {
    return startBackendSTT(language, onResult, onError);
  }
  
  // Use browser STT for English
  return startBrowserSTT(language, onResult, onError);
}

// Browser-based STT (Web Speech API)
function startBrowserSTT(
  language: string,
  onResult: (transcript: string) => void,
  onError: () => void
): () => void {
  const SR =
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  if (!SR) {
    onError();
    return () => {};
  }

  const recognition = new SR();
  recognition.lang = STT_LOCALE[language] ?? 'en-IN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (e: any) => {
    const transcript: string = e.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = () => {
    onError();
  };

  recognition.onend = () => {
    // recognition ended naturally — no-op, result already fired
  };

  recognition.start();

  return () => {
    try {
      recognition.stop();
    } catch {
      /* ignore */
    }
  };
}

// Backend-based STT (Indic Conformer model)
function startBackendSTT(
  language: string,
  onResult: (transcript: string) => void,
  onError: () => void
): () => void {
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let stopped = false;

  // Request microphone access
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      if (stopped) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length === 0) {
          onError();
          return;
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Send to backend for transcription
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');
          formData.append('language', language);

          const response = await fetch('http://localhost:8000/api/stt/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          onResult(data.transcription);
        } catch (error) {
          console.error('Backend STT error:', error);
          onError();
        }
      };

      mediaRecorder.start();
    })
    .catch(error => {
      console.error('Microphone access error:', error);
      onError();
    });

  // Return stop function
  return () => {
    stopped = true;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };
}