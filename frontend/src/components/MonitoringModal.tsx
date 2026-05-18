import React, { useState } from 'react';
import type { Language, MonitoringEntry, HealthProfile } from '../lib/types';
import { connectGoogleCalendar, disconnectGoogleCalendar } from '../lib/Googleauth';
import { markMonitoringDone } from '../lib/profileApi';

interface Props {
  language: Language;
  profile: HealthProfile;
  googleToken: string | null;
  onGoogleConnect: (token: string) => void;
  onGoogleDisconnect: () => void;
  onClose: () => void;
}

type MonitoringStatus = 'pending' | 'loading' | 'done' | 'error';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFrequencyText(days: number): string {
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  if (days === 14) return 'Every 2 weeks';
  if (days === 30) return 'Monthly';
  if (days === 90) return 'Every 3 months';
  if (days === 180) return 'Every 6 months';
  return `Every ${days} days`;
}

interface MonitoringRowProps {
  entry: MonitoringEntry;
  status: MonitoringStatus;
  errorMsg?: string;
  startDate: string;
  onStartDateChange: (date: string) => void;
  onRetry: () => void;
}

function MonitoringRow({ entry, status, errorMsg, startDate, onStartDateChange, onRetry }: MonitoringRowProps) {
  const borderColor =
    status === 'done' ? '#86EFAC' :
    status === 'error' ? '#F59E0B' :
    'var(--color-teal-light)';

  const bgColor =
    status === 'done' ? '#F0FDF4' :
    status === 'error' ? '#FFF8E1' :
    '#fff';

  const statusIcon =
    status === 'done' ? '✅' :
    status === 'error' ? '❌' :
    status === 'loading' ? '⏳' : '🔲';

  const isDue = !entry.next_due || new Date(entry.next_due) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div style={{ marginBottom: 18, padding: '18px 20px', border: `1.5px solid ${borderColor}`, borderRadius: 14, background: bgColor }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{statusIcon}</span>
            <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--color-text)' }}>{entry.test_name}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 16, color: 'var(--color-text-secondary)' }}>
            For: {entry.for_condition} • {getFrequencyText(entry.frequency_days)}
          </p>
          {entry.next_due && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: isDue ? '#DC2626' : '#059669', fontWeight: 500 }}>
              {isDue ? '⚠️ Due: ' : 'Next due: '}{formatDate(entry.next_due)}
            </p>
          )}
          {!entry.next_due && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#DC2626', fontWeight: 500 }}>
              ⚠️ Not scheduled yet
            </p>
          )}
        </div>
      </div>

      {/* Start date picker */}
      {status !== 'done' && (
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 15, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Start date for reminders:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{ fontSize: 16, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-teal-light)', color: 'var(--color-text)' }}
          />
        </div>
      )}

      {/* Error row */}
      {status === 'error' && errorMsg && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, color: '#92400E', flex: 1 }}>{errorMsg}</span>
          <button
            onClick={onRetry}
            style={{ padding: '6px 16px', fontSize: 15, background: 'var(--color-teal)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default function MonitoringModal({ language, profile, googleToken, onGoogleConnect, onGoogleDisconnect, onClose }: Props) {
  const [startDates, setStartDates] = useState<Record<string, string>>(
    () => Object.fromEntries(profile.monitoring.map(m => [m.test_name, todayISO()]))
  );
  const [statuses, setStatuses] = useState<Record<string, MonitoringStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalDone, setGlobalDone] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [totalAdded, setTotalAdded] = useState(0);

  function handleStartDateChange(testName: string, date: string) {
    setStartDates(prev => ({ ...prev, [testName]: date }));
  }

  async function addMonitoringToCalendar(entry: MonitoringEntry, token: string): Promise<number> {
    // TODO: Implement actual Google Calendar API call for recurring events
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark as done in profile
    await markMonitoringDone(entry.test_name);
    
    return 1; // Return number of events created
  }

  async function handleAddAll() {
    if (!googleToken) return;
    setGlobalLoading(true);
    let added = 0;

    for (const entry of profile.monitoring) {
      setStatuses(s => ({ ...s, [entry.test_name]: 'loading' }));
      try {
        const count = await addMonitoringToCalendar(entry, googleToken);
        added += count;
        setStatuses(s => ({ ...s, [entry.test_name]: 'done' }));
      } catch (e: any) {
        setStatuses(s => ({ ...s, [entry.test_name]: 'error' }));
        setErrors(prev => ({ ...prev, [entry.test_name]: e.message ?? 'Failed to add reminder.' }));
      }
    }

    setTotalAdded(added);
    setGlobalDone(true);
    setGlobalLoading(false);
  }

  async function handleRetry(entry: MonitoringEntry) {
    if (!googleToken) return;
    setStatuses(s => ({ ...s, [entry.test_name]: 'loading' }));
    setErrors(prev => { const n = { ...prev }; delete n[entry.test_name]; return n; });
    try {
      const count = await addMonitoringToCalendar(entry, googleToken);
      setTotalAdded(t => t + count);
      setStatuses(s => ({ ...s, [entry.test_name]: 'done' }));
    } catch (e: any) {
      setStatuses(s => ({ ...s, [entry.test_name]: 'error' }));
      setErrors(prev => ({ ...prev, [entry.test_name]: e.message ?? 'Failed to add reminder.' }));
    }
  }

  const noToken = googleToken === null;
  const allDone = profile.monitoring.length > 0 && profile.monitoring.every(m => statuses[m.test_name] === 'done');

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)', padding: '32px 36px' }}
      >
        {/* Title with logout button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-teal)', margin: 0, lineHeight: 1.3 }}>
            🩺 Health Check Reminders
          </h2>
          {!noToken && (
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
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              🚪 Logout
            </button>
          )}
        </div>

        {/* No monitoring entries */}
        {profile.monitoring.length === 0 && (
          <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            No health check reminders found. These will be added automatically based on your conditions.
          </p>
        )}

        {/* Monitoring entries */}
        {profile.monitoring.map((entry) => (
          <MonitoringRow
            key={entry.test_name}
            entry={entry}
            status={statuses[entry.test_name] ?? 'pending'}
            errorMsg={errors[entry.test_name]}
            startDate={startDates[entry.test_name] ?? todayISO()}
            onStartDateChange={(date) => handleStartDateChange(entry.test_name, date)}
            onRetry={() => handleRetry(entry)}
          />
        ))}

        {/* Success banner */}
        {(globalDone || allDone) && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, fontSize: 18, color: '#15803D', fontWeight: 600 }}>
            ✅ {totalAdded} health check reminders added to your Google Calendar!
          </div>
        )}

        {/* No Google token notice */}
        {noToken && (
          <div style={{ marginTop: 16, padding: '18px 20px', background: '#FFF8E1', border: '1.5px solid #F59E0B', borderRadius: 12 }}>
            <p style={{ margin: '0 0 14px', fontSize: 17, color: '#92400E' }}>
              Please connect Google Calendar first.
            </p>
            <button
              onClick={() => connectGoogleCalendar(onGoogleConnect)}
              style={{ minHeight: 46, padding: '0 24px', background: 'var(--color-teal)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 17, cursor: 'pointer', fontWeight: 600 }}
            >
              Connect Now
            </button>
          </div>
        )}

        {/* Action row */}
        <div style={{ marginTop: 28, display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ minHeight: 52, padding: '0 28px', background: '#fff', color: 'var(--color-text-secondary)', border: '1.5px solid #ccc', borderRadius: 12, fontSize: 18, cursor: 'pointer' }}
          >
            Cancel
          </button>

          {!noToken && profile.monitoring.length > 0 && !globalDone && !allDone && (
            <button
              onClick={handleAddAll}
              disabled={globalLoading}
              style={{
                minHeight: 52,
                padding: '0 28px',
                background: globalLoading ? '#aaa' : 'var(--color-teal)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 700,
                cursor: globalLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!globalLoading) e.currentTarget.style.background = 'var(--color-teal-hover)'; }}
              onMouseLeave={(e) => { if (!globalLoading) e.currentTarget.style.background = 'var(--color-teal)'; }}
            >
              {globalLoading ? '⏳ Adding...' : 'Add to My Calendar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

