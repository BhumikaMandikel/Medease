import React, { useEffect, useState } from 'react';
import type { Language } from '../lib/types';
import { getLabels } from '../lib/labels';

interface Props {
  language: Language;
  error: string | null;
  onGoBack: () => void;
}

export default function LoadingScreen({ language, error, onGoBack }: Props) {
  const labels = getLabels(language);
  const messages = [labels.processingMsg1, labels.processingMsg2, labels.processingMsg3];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 7000);
    return () => clearInterval(id);
  }, [error]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>⚠️</div>
          <p style={{ fontSize: 22, color: '#92400E', background: '#FFF8E1', border: '1.5px solid #F59E0B', borderRadius: 16, padding: '24px 28px', lineHeight: 1.7, marginBottom: 28 }}>
            {error}
          </p>
          <button
            onClick={onGoBack}
            style={{ minHeight: 56, padding: '0 40px', background: 'var(--color-teal)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-teal-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-teal)')}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
      
      {/* Pulsing circle */}
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer pulse ring */}
        <div
          className="animate-pulse-ring"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(26,107,90,0.15)',
          }}
        />
        {/* Inner solid circle */}
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--color-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(26,107,90,0.30)' }}>
          <span className="animate-float" style={{ fontSize: 36 }}>💊</span>
        </div>
      </div>

      {/* Cycling status text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-teal)', margin: 0, lineHeight: 1.4 }}>
          {messages[msgIndex]}
        </p>
        <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', marginTop: 10 }}>
          {labels.processingWait}
        </p>
      </div>
    </div>
  );
}
