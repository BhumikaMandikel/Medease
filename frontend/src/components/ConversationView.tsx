import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AnalysisResult, ChatMessage, Language, OutputMode, HealthProfile } from '../lib/types';
import { getLabels } from '../lib/labels';
import { askQuestion, askLifestyleQuestion } from '../lib/api';
import { stopSpeaking, isGeneratingAudio } from '../lib/tts';
import { storageSet, KEYS } from '../lib/storage';
import { connectGoogleCalendar, isGoogleConnected } from '../lib/Googleauth';
import ChatBubble from './ChatBubble';
import VoiceInputButton from './VoiceInputButton';
import ResponseOutputChoice from './ResponseOutputChoice';
import CalendarModal from './CalendarModal';
import MonitoringModal from './MonitoringModal';
import LanguageSelector from './LanguageSelector';

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  analysisResult: AnalysisResult;
  messages: ChatMessage[];
  onMessagesUpdate: (msgs: ChatMessage[]) => void;
  outputMode: OutputMode;
  onOutputModeChange: (mode: OutputMode) => void;
  googleToken: string | null;
  onGoogleConnect: (token: string) => void;
  onGoogleDisconnect: () => void;
  documentName: string;
  onNewDocument: () => void;
  profile: HealthProfile | null;
}

export default function ConversationView({
  language,
  onLanguageChange,
  analysisResult,
  messages,
  onMessagesUpdate,
  outputMode,
  onOutputModeChange,
  googleToken,
  onGoogleConnect,
  onGoogleDisconnect,
  documentName,
  onNewDocument,
  profile,
}: Props) {
  const labels = getLabels(language);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioGenerating, setIsAudioGenerating] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  
  // Determine if we have a document or are in lifestyle-only mode
  const hasDocument = analysisResult.medicines.length > 0 || analysisResult.clinical_context.length > 0;
  const [qaMode, setQaMode] = useState<'document' | 'lifestyle'>(hasDocument ? 'document' : 'lifestyle');
  const [showCloudPrompt, setShowCloudPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check audio generation status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAudioGenerating(isGeneratingAudio());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a question
  async function handleSendQuestion() {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    setIsLoading(true);
    setShowCloudPrompt(false);

    // Add user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMsg];
    onMessagesUpdate(newMessages);
    storageSet(KEYS.MESSAGES, JSON.stringify(newMessages));

    try {
      let answer: string;
      let suggestedCloud = false;

      if (qaMode === 'lifestyle') {
        // Lifestyle Q&A mode
        const response = await askLifestyleQuestion({ question, language });
        answer = response.answer;
        suggestedCloud = response.suggested_cloud;
      } else {
        // Document Q&A mode
        answer = await askQuestion({
          question,
          conversation_history: messages.map(m => ({ role: m.role, content: m.content })),
          clinical_context: analysisResult.clinical_context,
          narrative_explanation: analysisResult.narrative_explanation,
          language,
        });
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...newMessages, assistantMsg];
      onMessagesUpdate(finalMessages);
      storageSet(KEYS.MESSAGES, JSON.stringify(finalMessages));

      // Show cloud prompt if suggested
      if (suggestedCloud) {
        setShowCloudPrompt(true);
      }

      // Audio will be generated automatically by EnhancedAudioControls if in audio mode
    } catch (e) {
      console.error('Q&A error:', e);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle regenerate answer
  async function handleRegenerateAnswer(messageId: string) {
    // Find the message to regenerate
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return; // Can't regenerate if not found or if it's the first message
    
    // Get the user question that prompted this answer (previous message)
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    setIsLoading(true);
    
    try {
      let answer: string;
      let suggestedCloud = false;

      if (qaMode === 'lifestyle') {
        // Lifestyle Q&A mode
        const response = await askLifestyleQuestion({ question: userMessage.content, language });
        answer = response.answer;
        suggestedCloud = response.suggested_cloud;
      } else {
        // Document Q&A mode - use conversation history up to the user message
        const historyUpToQuestion = messages.slice(0, messageIndex).map(m => ({ role: m.role, content: m.content }));
        answer = await askQuestion({
          question: userMessage.content,
          conversation_history: historyUpToQuestion,
          clinical_context: analysisResult.clinical_context,
          narrative_explanation: analysisResult.narrative_explanation,
          language,
        });
      }

      // Replace the assistant message with the new answer
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: answer,
        timestamp: new Date().toISOString(),
        audioUrl: undefined, // Clear old audio
      };
      
      onMessagesUpdate(updatedMessages);
      storageSet(KEYS.MESSAGES, JSON.stringify(updatedMessages));

      // Show cloud prompt if suggested
      if (suggestedCloud) {
        setShowCloudPrompt(true);
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle voice input
  function handleVoiceResult(transcript: string) {
    setInput(transcript);
    // Optionally auto-send after voice input
    // handleSendQuestion();
  }

  // Handle voice input error
  function handleVoiceError(error: string) {
    console.error('Voice input error:', error);
  }

  // Handle audio generation for messages
  function handleAudioGenerated(messageId: string, url: string) {
    // Update message with audio URL
    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, audioUrl: url } : msg
    );
    onMessagesUpdate(updatedMessages);
    storageSet(KEYS.MESSAGES, JSON.stringify(updatedMessages));
  }

  // Handle opening calendar modal
  function handleOpenCalendarModal() {
    setShowCalendarModal(true);
  }

  // Handle closing calendar modal
  function handleCloseCalendarModal() {
    setShowCalendarModal(false);
  }

  // Handle Google Calendar connection
  function handleConnectGoogle() {
    connectGoogleCalendar((token) => {
      onGoogleConnect(token);
    });
  }

  // Handle key press in input
  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f5f0' }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #e5e0d8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#2d3436' }}>💊 MedEase</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#636e72' }}>{documentName}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <LanguageSelector selected={language} onChange={onLanguageChange} compact />
          {/* Google Calendar Button - only show if we have a document with medicines */}
          {hasDocument && (
            <>
              {!googleToken ? (
                <button
                  onClick={handleConnectGoogle}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    background: 'var(--color-teal)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  📅 Connect Google Calendar
                </button>
              ) : (
                <>
                  <button
                    onClick={handleOpenCalendarModal}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      background: 'var(--color-teal)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    📅 Medicine Reminders
                  </button>
                  {profile && profile.monitoring.length > 0 && (
                    <button
                      onClick={() => setShowMonitoringModal(true)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        background: 'var(--color-teal)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      🩺 Health Check Reminders
                    </button>
                  )}
                </>
              )}
            </>
          )}
          <button
            onClick={onNewDocument}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: '#f1f2f6',
              border: '1px solid #dfe6e9',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {hasDocument ? labels.newDocument : '🏠 Back to Home'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Initial summary message */}
        {messages[0]?.isInitialSummary && (
          <div style={{ marginBottom: '24px' }}>
            <ChatBubble
              message={messages[0]}
              language={language}
              outputMode={outputMode}
              onAudioGenerated={handleAudioGenerated}
            />
            <ResponseOutputChoice
              mode={outputMode}
              onChange={onOutputModeChange}
              language={language}
            />
          </div>
        )}

        {/* Other messages */}
        {messages.filter(m => !m.isInitialSummary).map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg}
            language={language}
            outputMode={outputMode}
            onAudioGenerated={handleAudioGenerated}
            onRegenerate={msg.role === 'assistant' ? handleRegenerateAnswer : undefined}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#636e72' }}>
            Thinking...
          </div>
        )}

        {/* Audio generation indicator */}
        {isAudioGenerating && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: '#fff3cd',
            borderRadius: '12px',
            color: '#856404',
            fontSize: '14px',
            fontWeight: 500,
            margin: '12px 0',
            border: '1px solid #ffeaa7'
          }}>
            {labels.generatingAudio}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


      {/* Input area */}
      <div style={{
        padding: '16px 24px',
        background: '#fff',
        borderTop: '1px solid #e5e0d8',
      }}>
        {/* Mode toggle - only show if we have a document */}
        {hasDocument && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setQaMode('document')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: qaMode === 'document' ? 'var(--color-teal)' : '#f1f2f6',
                color: qaMode === 'document' ? '#fff' : '#636e72',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              📄 Document Q&A
            </button>
            <button
              onClick={() => setQaMode('lifestyle')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: qaMode === 'lifestyle' ? 'var(--color-teal)' : '#f1f2f6',
                color: qaMode === 'lifestyle' ? '#fff' : '#636e72',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              💬 General Health Q&A
            </button>
          </div>
        )}
        
        {/* Info banner for lifestyle-only mode */}
        {!hasDocument && (
          <div style={{
            padding: '12px 16px',
            background: '#E8F5E9',
            border: '1px solid #4CAF50',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#2E7D32',
          }}>
            💬 Ask me anything about food, activities, or general health questions!
          </div>
        )}

        {/* Cloud prompt */}
        {showCloudPrompt && (
          <div style={{
            padding: '12px 16px',
            background: '#FFF8E1',
            border: '1px solid #F59E0B',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#92400E',
          }}>
            <p style={{ margin: '0 0 8px' }}>
              I want to get a more accurate answer. I'll remove all personal details before asking online. Is that okay?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowCloudPrompt(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                No, thanks
              </button>
              <button
                onClick={() => {
                  setShowCloudPrompt(false);
                  // TODO: Implement cloud Q&A call
                  alert('Cloud Q&A not yet implemented');
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'var(--color-teal)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Yes, proceed
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <VoiceInputButton
            language={language}
            onTranscript={handleVoiceResult}
          />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={qaMode === 'lifestyle' ? 'Ask about food, activity, or general health...' : labels.askPlaceholder}
            disabled={isLoading}
            style={{
              flex: 1,
              minHeight: '44px',
              maxHeight: '120px',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #dfe6e9',
              borderRadius: '12px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSendQuestion}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              background: input.trim() && !isLoading ? '#4a69bd' : '#b2bec3',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {labels.sendButton}
          </button>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendarModal && (
        <CalendarModal
          language={language}
          medicines={analysisResult.medicines}
          googleToken={googleToken}
          onGoogleConnect={onGoogleConnect}
          onGoogleDisconnect={onGoogleDisconnect}
          onClose={handleCloseCalendarModal}
        />
      )}

      {/* Monitoring Modal */}
      {showMonitoringModal && profile && (
        <MonitoringModal
          language={language}
          profile={profile}
          googleToken={googleToken}
          onGoogleConnect={onGoogleConnect}
          onGoogleDisconnect={onGoogleDisconnect}
          onClose={() => setShowMonitoringModal(false)}
        />
      )}
    </div>
  );
}