import React, { useState, useRef } from 'react';
import type { Language } from '../lib/types';
import { isSTTSupported, startListening } from '../lib/stt';

interface Props {
  language: Language;
  onTranscript: (text: string) => void;
}

type VoiceState = 'idle' | 'listening' | 'got';

export default function VoiceInputButton({ language, onTranscript }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const stopRef = useRef<(() => void) | null>(null);

  if (!isSTTSupported()) return null;

  function handleClick() {
    if (state === 'listening') {
      stopRef.current?.();
      setState('idle');
      return;
    }

    setState('listening');
    stopRef.current = startListening(
      language,
      (transcript) => {
        onTranscript(transcript);
        setState('got');
        setTimeout(() => setState('idle'), 2000);
      },
      () => {
        setState('idle');
      }
    );
  }

  const label =
    state === 'listening' ? 'Listening...' :
    state === 'got'       ? 'Got it!' :
                            'Ask a question';

  const bg =
    state === 'listening' ? '#DC2626' : 'var(--color-teal)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <button
        onClick={handleClick}
        className={state === 'listening' ? 'animate-record-pulse' : ''}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: 'none',
          background: bg,
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}
        aria-label={label}
      >
        🎤
      </button>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 80 }}>
        {label}
      </span>
    </div>
  );
}
