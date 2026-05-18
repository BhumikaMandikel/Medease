import React, { useRef, useState } from 'react';
import type { Language } from '../lib/types';
import { getLabels } from '../lib/labels';
import { connectGoogleCalendar, disconnectGoogleCalendar } from '../lib/Googleauth';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

interface Props {
  language: Language;
  languageSelectorSlot: React.ReactNode;
  googleToken: string | null;
  onGoogleConnect: (token: string) => void;
  onGoogleDisconnect: () => void;
  onProcess: (file: File) => void;
  onSkipToQuestions?: () => void;
}

export default function UploadZone({
  language,
  languageSelectorSlot,
  googleToken,
  onGoogleConnect,
  onGoogleDisconnect,
  onProcess,
  onSkipToQuestions,
}: Props) {
  const labels = getLabels(language);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndSet(file: File) {
    setError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setError('File is too large. Maximum size is 20MB.');
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted.');
      return;
    }
    setSelectedFile(file);
    if (file.type !== 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  }

  const connected = googleToken !== null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 44, fontWeight: 700, color: 'var(--color-teal)', margin: 0, lineHeight: 1.2 }}>
          {labels.uploadTitle}
        </h1>
        <p style={{ fontSize: 22, color: 'var(--color-text-secondary)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          {labels.uploadSubtitle}
        </p>
      </div>

      {/* Language selector slot */}
      <div style={{ marginBottom: 32, width: '100%', maxWidth: 560 }}>
        {languageSelectorSlot}
      </div>

      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          style={{
            border: `2.5px dashed ${dragOver ? 'var(--color-teal)' : 'var(--color-teal-light)'}`,
            borderRadius: 20,
            background: dragOver ? 'rgba(26,107,90,0.04)' : '#fff',
            padding: '52px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: dragOver ? '0 0 0 4px rgba(26,107,90,0.12)' : 'var(--shadow-card)',
            transition: 'all 200ms ease',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
          <p style={{ fontSize: 20, color: 'var(--color-text)', whiteSpace: 'pre-line', marginBottom: 14, lineHeight: 1.7 }}>
            {labels.dropzone}
          </p>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', margin: 0 }}>
            {labels.dropzoneHint}
          </p>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileInput} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: '16px 20px', background: '#FFF8E1', border: '1.5px solid #F59E0B', borderRadius: 12, fontSize: 18, color: '#92400E' }}>
            ⚠️ {error}
          </div>
        )}

        {/* File preview */}
        {selectedFile && !error && (
          <div style={{ marginTop: 20, padding: '20px 24px', background: '#fff', border: '1.5px solid var(--color-teal-light)', borderRadius: 16, boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 16 }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, background: 'var(--color-teal-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>📄</div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)', wordBreak: 'break-all' }}>{selectedFile.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--color-text-secondary)' }}>
                {selectedFile.type === 'application/pdf' ? 'PDF Document' : 'Image'} • {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        )}

        {/* Process button */}
        {selectedFile && !error && (
          <button
            onClick={() => onProcess(selectedFile)}
            style={{ marginTop: 20, width: '100%', minHeight: 62, background: 'var(--color-teal)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 20, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 18px rgba(26,107,90,0.30)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-teal-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-teal)')}
          >
            {labels.processButton}
          </button>
        )}

        {/* OR divider with "Ask a Question" button */}
        <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1, borderTop: '1px solid var(--color-teal-light)' }} />
          <span style={{ fontSize: 16, color: 'var(--color-text-secondary)', fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, borderTop: '1px solid var(--color-teal-light)' }} />
        </div>

        {/* Ask a Question button */}
        {onSkipToQuestions && (
          <button
            onClick={onSkipToQuestions}
            style={{
              width: '100%',
              minHeight: 62,
              background: '#fff',
              color: 'var(--color-teal)',
              border: '2px solid var(--color-teal)',
              borderRadius: 16,
              fontSize: 20,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(26,107,90,0.15)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-teal)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = 'var(--color-teal)';
            }}
          >
            💬 Ask a Health Question
          </button>
        )}

        {/* Divider */}
        <div style={{ margin: '36px 0 24px', borderTop: '1px solid var(--color-teal-light)' }} />

        {/* Google Calendar */}
        {connected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 18, color: 'var(--color-teal)', fontWeight: 600 }}>
              {labels.calendarConnected}
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to disconnect your Google Calendar?')) {
                  disconnectGoogleCalendar();
                  onGoogleDisconnect();
                }
              }}
              style={{
                padding: '8px 16px',
                background: '#fff',
                color: '#DC2626',
                border: '1.5px solid #DC2626',
                borderRadius: 8,
                fontSize: 15,
                cursor: 'pointer',
                fontWeight: 600,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEE2E2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              🚪 Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => connectGoogleCalendar(onGoogleConnect)}
            style={{ display: 'block', width: '100%', minHeight: 54, background: '#fff', color: 'var(--color-teal)', border: '2px solid var(--color-teal-light)', borderRadius: 14, fontSize: 18, cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-teal-light)')}
          >
            {labels.connectCalendar}
          </button>
        )}
      </div>
    </div>
  );
}
