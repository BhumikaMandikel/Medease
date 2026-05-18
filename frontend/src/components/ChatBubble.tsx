import React from 'react';
import type { ChatMessage, Language, OutputMode } from '../lib/types';
import EnhancedAudioControls from './EnhancedAudioControls';

interface Props {
  message: ChatMessage;
  language: Language;
  outputMode: OutputMode;
  onAudioGenerated?: (messageId: string, url: string) => void;
  onRegenerate?: (messageId: string) => void;
  showScannedNotice?: boolean;
  showPageLimitNotice?: boolean;
}

export default function ChatBubble({
  message,
  language,
  outputMode,
  onAudioGenerated,
  onRegenerate,
  showScannedNotice = false,
  showPageLimitNotice = false,
}: Props) {
  const isAssistant = message.role === 'assistant';
  const isInitial = message.isInitialSummary;

  if (!isAssistant) {
    // User bubble — right aligned, teal bg
    return (
      <div className="animate-fade-in-up" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          maxWidth: '72%',
          background: 'var(--color-teal)',
          color: '#fff',
          borderRadius: 16,
          padding: '18px 22px',
          fontSize: 18,
          lineHeight: 1.7,
          boxShadow: 'var(--shadow-bubble)',
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant bubble
  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16, maxWidth: '84%' }}>
      <div style={{
        background: '#fff',
        border: `1.5px solid var(--color-bubble-border)`,
        borderRadius: 16,
        borderTop: isInitial ? '4px solid var(--color-teal)' : '1.5px solid var(--color-bubble-border)',
        padding: '22px 26px',
        boxShadow: 'var(--shadow-bubble)',
        width: '100%',
      }}>
        {/* Greeting prefix for initial summary */}
        {isInitial && (
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-teal)', marginBottom: 16, marginTop: 0, lineHeight: 1.5 }}>
            🤝 Hi! I've read your document. Here is what your doctor said 👇
          </p>
        )}

        {/* Message content */}
        <div style={{ fontSize: isInitial ? 20 : 18, lineHeight: 1.8, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>

        {/* Notices */}
        {showScannedNotice && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, fontSize: 15, color: '#0369A1' }}>
            ℹ️ This looked like a scanned document. I read it from the image.
          </div>
        )}
        {showPageLimitNotice && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, fontSize: 15, color: '#0369A1' }}>
            ℹ️ Your document had more than 5 pages. I read the first 5 pages.
          </div>
        )}

        {/* Enhanced Audio controls */}
        {outputMode === 'audio' && (
          <EnhancedAudioControls
            messageId={message.id}
            text={message.content}
            language={language}
            audioUrl={message.audioUrl}
            onAudioGenerated={(url) => onAudioGenerated?.(message.id, url)}
          />
        )}

        {/* Regenerate button - only for assistant messages that are not initial summary */}
        {!isInitial && onRegenerate && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onRegenerate(message.id)}
              style={{
                padding: '8px 14px',
                fontSize: 14,
                background: '#f1f2f6',
                border: '1px solid #dfe6e9',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#636e72',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e1e2e6';
                e.currentTarget.style.borderColor = '#b2bec3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f2f6';
                e.currentTarget.style.borderColor = '#dfe6e9';
              }}
            >
              🔄 Regenerate Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
