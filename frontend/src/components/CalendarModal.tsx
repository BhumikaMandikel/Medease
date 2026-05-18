import React, { useState } from 'react';
import type { Language, Medicine, MealTimes } from '../lib/types';
import { addCalendarEvents } from '../lib/api';
import { connectGoogleCalendar, disconnectGoogleCalendar } from '../lib/Googleauth';
import { patchProfile } from '../lib/profileApi';

interface Props {
  language: Language;
  medicines: Medicine[];
  googleToken: string | null;
  onGoogleConnect: (token: string) => void;
  onGoogleDisconnect: () => void;
  onClose: () => void;
}

type MedStatus = 'pending' | 'loading' | 'done' | 'error';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt24to12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Sub-component for a single medicine row (so hooks are at component level)
interface MedRowProps {
  med: Medicine;
  status: MedStatus;
  errorMsg?: string;
  editedTimes: string[];
  onTimeChange: (idx: number, val: string) => void;
  onRetry: () => void;
}

function MedRow({ med, status, errorMsg, editedTimes, onTimeChange, onRetry }: MedRowProps) {
  const [showEdit, setShowEdit] = useState(false);

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

  return (
    <div style={{ marginBottom: 18, padding: '18px 20px', border: `1.5px solid ${borderColor}`, borderRadius: 14, background: bgColor }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{statusIcon}</span>
            <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--color-text)' }}>{med.name}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 16, color: 'var(--color-text-secondary)' }}>
            {editedTimes.map(fmt24to12).join(' and ')}  •  {med.duration_days} days
          </p>
        </div>
        {status !== 'done' && (
          <button
            onClick={() => setShowEdit((v) => !v)}
            style={{ minHeight: 34, padding: '4px 14px', fontSize: 15, background: '#fff', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0 }}
          >
            {showEdit ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* Inline time editor */}
      {showEdit && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {editedTimes.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>Dose {i + 1}:</label>
              <input
                type="time"
                value={t}
                onChange={(e) => onTimeChange(i, e.target.value)}
                style={{ fontSize: 16, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-teal-light)', color: 'var(--color-text)' }}
              />
            </div>
          ))}
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

export default function CalendarModal({ language, medicines, googleToken, onGoogleConnect, onGoogleDisconnect, onClose }: Props) {
  const eligible = medicines.filter((m) => m.duration_days > 0);
  const ineligible = medicines.filter((m) => m.duration_days === 0);

  const [startDate, setStartDate] = useState(todayISO());
  const [statuses, setStatuses] = useState<Record<string, MedStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalDone, setGlobalDone] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [totalAdded, setTotalAdded] = useState(0);

  // Detect user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Edited times: keyed by medicine name
  const [editedTimes, setEditedTimes] = useState<Record<string, string[]>>(
    () => Object.fromEntries(eligible.map((m) => [m.name, [...m.timing_times]]))
  );

  function handleTimeChange(medName: string, idx: number, val: string) {
    setEditedTimes((prev) => {
      const next = [...(prev[medName] ?? [])];
      next[idx] = val;
      return { ...prev, [medName]: next };
    });
  }

  async function runAddForMed(med: Medicine, token: string): Promise<number> {
    const result = await addCalendarEvents({
      medicine_name: med.name,
      dosage: med.dosage,
      timing_times: editedTimes[med.name] ?? med.timing_times,
      duration_days: med.duration_days,
      start_date: startDate,
      access_token: token,
      timezone: userTimezone,
    });
    return result.events_created;
  }

  async function handleAddAll() {
    if (!googleToken) return;
    setGlobalLoading(true);
    let added = 0;

    for (const med of eligible) {
      setStatuses((s) => ({ ...s, [med.name]: 'loading' }));
      try {
        const count = await runAddForMed(med, googleToken);
        added += count;
        setStatuses((s) => ({ ...s, [med.name]: 'done' }));
      } catch (e: any) {
        setStatuses((s) => ({ ...s, [med.name]: 'error' }));
        setErrors((prev) => ({ ...prev, [med.name]: e.message ?? 'Failed to add events.' }));
      }
    }

    setTotalAdded(added);
    setGlobalDone(true);
    setGlobalLoading(false);

    // DISABLED: Auto-inferring meal times from medicine timing_times
    // This was causing compounding offset issues because medicine times already have 30-min offset applied.
    // Meal times should be explicitly set by user in profile settings only.
    /*
    try {
      const allTimes: string[] = [];
      for (const med of eligible) {
        const times = editedTimes[med.name] ?? med.timing_times;
        allTimes.push(...times);
      }
      
      if (allTimes.length > 0) {
        // Get unique times and sort them
        const uniqueTimes = Array.from(new Set(allTimes)).sort();
        
        const mealTimes: MealTimes = {};
        
        if (uniqueTimes.length >= 1) {
          mealTimes.breakfast = uniqueTimes[0]; // Earliest
        }
        if (uniqueTimes.length >= 2) {
          mealTimes.dinner = uniqueTimes[uniqueTimes.length - 1]; // Latest
        }
        if (uniqueTimes.length >= 3) {
          // Middle one is lunch
          const middleIndex = Math.floor(uniqueTimes.length / 2);
          mealTimes.lunch = uniqueTimes[middleIndex];
        }
        
        // Silently save to profile (no toast, no message)
        await patchProfile({ meal_times: mealTimes });
      }
    } catch (error) {
      // Silent failure - never surface to user
      console.warn('Failed to save meal times:', error);
    }
    */
  }

  async function handleRetry(med: Medicine) {
    if (!googleToken) return;
    setStatuses((s) => ({ ...s, [med.name]: 'loading' }));
    setErrors((prev) => { const n = { ...prev }; delete n[med.name]; return n; });
    try {
      const count = await runAddForMed(med, googleToken);
      setTotalAdded((t) => t + count);
      setStatuses((s) => ({ ...s, [med.name]: 'done' }));
    } catch (e: any) {
      setStatuses((s) => ({ ...s, [med.name]: 'error' }));
      setErrors((prev) => ({ ...prev, [med.name]: e.message ?? 'Failed to add events.' }));
    }
  }

  const noToken = googleToken === null;
  const allDone = eligible.length > 0 && eligible.every((m) => statuses[m.name] === 'done');

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      {/* Modal box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)', padding: '32px 36px' }}
      >
        {/* Title with logout button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--color-teal)', margin: 0, lineHeight: 1.3 }}>
            📅 Add Medicine Reminders to Google Calendar
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEE2E2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              🚪 Logout
            </button>
          )}
        </div>

        {/* Start date */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
            Start date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ fontSize: 18, padding: '10px 16px', borderRadius: 10, border: '1.5px solid var(--color-teal-light)', color: 'var(--color-text)', cursor: 'pointer', outline: 'none' }}
          />
        </div>

        {/* No eligible medicines */}
        {eligible.length === 0 && (
          <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            No medicines with a specified duration were found.
          </p>
        )}

        {/* Eligible medicine rows */}
        {eligible.map((med) => (
          <MedRow
            key={med.name}
            med={med}
            status={statuses[med.name] ?? 'pending'}
            errorMsg={errors[med.name]}
            editedTimes={editedTimes[med.name] ?? med.timing_times}
            onTimeChange={(idx, val) => handleTimeChange(med.name, idx, val)}
            onRetry={() => handleRetry(med)}
          />
        ))}

        {/* Ineligible (duration=0) medicines */}
        {ineligible.map((med) => (
          <div key={med.name} style={{ marginBottom: 12, padding: '14px 18px', border: '1px solid #eee', borderRadius: 12, background: '#FAFAFA', opacity: 0.65 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: '#555' }}>{med.name}</span>
              <span style={{ fontSize: 14, color: '#888' }}>— duration not found</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#999' }}>
              Cannot add reminders (day count missing)
            </p>
          </div>
        ))}

        {/* Success banner */}
        {(globalDone || allDone) && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, fontSize: 18, color: '#15803D', fontWeight: 600 }}>
            ✅ {totalAdded} reminders added to your Google Calendar!
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

          {!noToken && eligible.length > 0 && !globalDone && !allDone && (
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
