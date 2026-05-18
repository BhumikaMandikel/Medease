import React from 'react';
import type { Language, OutputMode } from '../lib/types';
import { getLabels } from '../lib/labels';

interface Props {
  language: Language;
  mode: OutputMode;
  onChange: (mode: OutputMode) => void;
}

export default function ResponseOutputChoice({ language, mode, onChange }: Props) {
  const labels = getLabels(language);

  const btnBase: React.CSSProperties = {
    minHeight: 52,
    padding: '0 22px',
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1.5px solid',
    transition: 'all 150ms ease',
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
      <button
        onClick={() => onChange('audio')}
        style={{
          ...btnBase,
          background: mode === 'audio' ? 'var(--color-teal)' : '#fff',
          color: mode === 'audio' ? '#fff' : 'var(--color-teal)',
          borderColor: 'var(--color-teal)',
        }}
        onMouseEnter={(e) => { if (mode !== 'audio') { e.currentTarget.style.background = 'rgba(26,107,90,0.07)'; } }}
        onMouseLeave={(e) => { if (mode !== 'audio') { e.currentTarget.style.background = '#fff'; } }}
      >
        {mode === 'audio' ? '🔊 ' + labels.listenButton + ' ✓' : '🔊 ' + labels.listenButton}
      </button>

      <button
        onClick={() => onChange('text')}
        style={{
          ...btnBase,
          background: mode === 'text' ? 'var(--color-teal)' : '#fff',
          color: mode === 'text' ? '#fff' : 'var(--color-text-secondary)',
          borderColor: mode === 'text' ? 'var(--color-teal)' : '#ccc',
        }}
        onMouseEnter={(e) => { if (mode !== 'text') { e.currentTarget.style.borderColor = 'var(--color-teal)'; e.currentTarget.style.color = 'var(--color-teal)'; } }}
        onMouseLeave={(e) => { if (mode !== 'text') { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = 'var(--color-text-secondary)'; } }}
      >
        {mode === 'text' ? '📖 ' + labels.readButton + ' ✓' : '📖 ' + labels.readButton}
      </button>
    </div>
  );
}
