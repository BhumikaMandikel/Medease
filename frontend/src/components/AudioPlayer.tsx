import React, { useState } from 'react';
import { pauseSpeaking, resumeSpeaking, stopSpeaking } from '../lib/tts';
import type { Language } from '../lib/types';
import { getLabels } from '../lib/labels';

interface Props {
  language: Language;
  previewText: string;
  onStop: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
}

export default function AudioPlayer({ language, previewText, onStop, rate, onRateChange }: Props) {
  const labels = getLabels(language);
  const [paused, setPaused] = useState(false);

  function handlePauseResume() {
    if (paused) {
      resumeSpeaking();
      setPaused(false);
    } else {
      pauseSpeaking();
      setPaused(true);
    }
  }

  function handleStop() {
    stopSpeaking();
    onStop();
  }

  // Truncate preview text for display
  const preview = previewText.length > 60 ? previewText.slice(0, 60) + '...' : previewText;

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-teal) 0%, #1a7a65 100%)',
      color: '#fff',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      borderRadius: '12px',
      marginBottom: '12px',
    }}>
      {/* Play/Pause Button - Most prominent */}
      <button
        onClick={handlePauseResume}
        style={{
          background: paused ? '#4CAF50' : 'rgba(255,255,255,0.25)',
          border: '2px solid rgba(255,255,255,0.6)',
          borderRadius: 10,
          color: '#fff',
          padding: '10px 20px',
          fontSize: 17,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
          minWidth: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
          boxShadow: paused ? '0 2px 8px rgba(76,175,80,0.4)' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {paused ? (
          <>
            <span style={{ fontSize: 20 }}>▶️</span>
            <span>{labels.resumeButton}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 20 }}>⏸</span>
            <span>{labels.pauseButton}</span>
          </>
        )}
      </button>

      {/* Preview text */}
      <div style={{
        flex: 1,
        opacity: 0.9,
        fontSize: 15,
        fontStyle: 'italic',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
        🎵 {preview}
      </div>

      {/* Speed control */}
      <button
        onClick={() => onRateChange(rate === 0.7 ? 1.0 : 0.7)}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.5)',
          borderRadius: 8,
          color: '#fff',
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          minHeight: 38,
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
      >
        {rate === 0.7 ? '🐢 Slow' : '⚡ Normal'}
      </button>

      {/* Stop button - Clear and prominent */}
      <button
        onClick={handleStop}
        style={{
          background: '#f44336',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: 10,
          color: '#fff',
          padding: '10px 20px',
          fontSize: 17,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
          minWidth: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(244,67,54,0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#d32f2f';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f44336';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: 18 }}>⏹</span>
        <span>{labels.stopButton}</span>
      </button>
    </div>
  );
}
