import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../lib/types';
import { getLabels } from '../lib/labels';
import {
  generateAudio,
  playAudio,
  pauseSpeaking,
  resumeSpeaking,
  stopSpeaking,
  replayAudio,
  downloadAudio,
  isSpeaking,
  isPaused,
  isGeneratingAudio,
  getCurrentMessageId
} from '../lib/tts';

interface Props {
  messageId: string;
  text: string;
  language: Language;
  audioUrl?: string;
  onAudioGenerated?: (url: string) => void;
}

export default function EnhancedAudioControls({
  messageId,
  text,
  language,
  audioUrl: initialAudioUrl,
  onAudioGenerated
}: Props) {
  const labels = getLabels(language);
  const [audioUrl, setAudioUrl] = useState<string>(initialAudioUrl || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPausedState, setIsPausedState] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(!!initialAudioUrl);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const generationStartedRef = useRef(false);

  // Check playback state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMsgId = getCurrentMessageId();
      const isThisPlaying = currentMsgId === messageId && isSpeaking();
      const isThisPaused = currentMsgId === messageId && isPaused();
      
      setIsPlaying(isThisPlaying);
      setIsPausedState(isThisPaused);
    }, 100);
    
    return () => clearInterval(interval);
  }, [messageId]);

  async function handleGenerateAudio() {
    // Prevent multiple simultaneous generations
    if (generationStartedRef.current || isGenerating) return;
    
    generationStartedRef.current = true;
    setIsGenerating(true);
    setGenerationComplete(false);
    
    try {
      const url = await generateAudio(text, language, messageId);
      setAudioUrl(url);
      setGenerationComplete(true);
      onAudioGenerated?.(url);
    } catch (error) {
      console.error('Audio generation error:', error);
      generationStartedRef.current = false; // Reset on error
      setGenerationComplete(false);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePlay() {
    try {
      await playAudio(audioUrl, text, language, messageId, () => {
        setIsPlaying(false);
        setIsPausedState(false);
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Playback error:', error);
    }
  }

  function handlePause() {
    pauseSpeaking();
    setIsPausedState(true);
    setIsPlaying(false);
  }

  function handleResume() {
    resumeSpeaking();
    setIsPausedState(false);
    setIsPlaying(true);
  }

  function handleReplay() {
    if (audioUrl || language.toLowerCase() === 'english') {
      stopSpeaking();
      handlePlay();
    }
  }

  function handleDownload() {
    if (audioUrl) {
      const filename = `medease-audio-${messageId.substring(0, 8)}.wav`;
      downloadAudio(audioUrl, filename);
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    }
  }

  // Show generating message
  if (isGenerating) {
    return (
      <div style={{
        marginTop: 12,
        padding: '12px 16px',
        background: '#FFF3CD',
        border: '1px solid #FFE69C',
        borderRadius: 8,
        fontSize: 14,
        color: '#856404',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🎵</span>
        <span>{labels.generatingAudio}</span>
      </div>
    );
  }

  // Show initial "Generate Audio" button if audio hasn't been generated yet
  if (!generationComplete && !isPlaying && !isPausedState) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleGenerateAudio}
          style={{
            padding: '10px 18px',
            fontSize: 15,
            background: 'var(--color-teal)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🎵</span>
          <span>Generate Audio</span>
        </button>
      </div>
    );
  }

  // Show generation complete message with controls
  if (generationComplete && !isPlaying && !isPausedState) {
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{
          padding: '10px 14px',
          background: '#D1FAE5',
          border: '1px solid #6EE7B7',
          borderRadius: 8,
          fontSize: 14,
          color: '#065F46',
          marginBottom: 8,
        }}>
          ✅ {labels.audioGenerationComplete}
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handlePlay}
            style={{
              padding: '10px 18px',
              fontSize: 15,
              background: 'var(--color-teal)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>▶️</span>
            <span>{labels.playAudioButton}</span>
          </button>

          {audioUrl && (
            <button
              onClick={handleDownload}
              style={{
                padding: '10px 18px',
                fontSize: 15,
                background: '#fff',
                color: 'var(--color-teal)',
                border: '1.5px solid var(--color-teal)',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>💾</span>
              <span>{labels.downloadAudioButton}</span>
            </button>
          )}
        </div>

        {downloadComplete && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#D1FAE5',
            border: '1px solid #6EE7B7',
            borderRadius: 6,
            fontSize: 13,
            color: '#065F46',
          }}>
            {labels.audioDownloaded}
          </div>
        )}
      </div>
    );
  }

  // Show playback controls when playing or paused
  if (isPlaying || isPausedState) {
    return (
      <div style={{
        marginTop: 12,
        padding: '14px 18px',
        background: 'linear-gradient(135deg, var(--color-teal) 0%, #1a7a65 100%)',
        borderRadius: 10,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {isPausedState ? (
          <button
            onClick={handleResume}
            style={{
              padding: '10px 18px',
              fontSize: 15,
              background: '#4CAF50',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>▶️</span>
            <span>{labels.resumeButton}</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            style={{
              padding: '10px 18px',
              fontSize: 15,
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⏸</span>
            <span>{labels.pauseButton}</span>
          </button>
        )}

        <button
          onClick={handleReplay}
          style={{
            padding: '10px 18px',
            fontSize: 15,
            background: 'rgba(255,255,255,0.25)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.6)',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🔄</span>
          <span>{labels.replayAudioButton}</span>
        </button>

        <button
          onClick={() => {
            stopSpeaking();
            setIsPlaying(false);
            setIsPausedState(false);
          }}
          style={{
            padding: '10px 18px',
            fontSize: 15,
            background: '#f44336',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⏹</span>
          <span>{labels.stopButton}</span>
        </button>

        {audioUrl && (
          <button
            onClick={handleDownload}
            style={{
              padding: '10px 18px',
              fontSize: 15,
              background: 'rgba(255,255,255,0.9)',
              color: 'var(--color-teal)',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>💾</span>
            <span>{labels.downloadAudioButton}</span>
          </button>
        )}

        {downloadComplete && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 6,
            fontSize: 13,
            color: '#065F46',
            fontWeight: 600,
          }}>
            {labels.audioDownloaded}
          </div>
        )}
      </div>
    );
  }

  return null;
}

