import React from 'react';
import type { Language } from '../lib/types';
import { KEYS, storageSet } from '../lib/storage';

interface Props {
  selected: Language;
  onChange: (lang: Language) => void;
  compact?: boolean; // compact mode for top bar
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'english', label: 'English' },
  { code: 'hindi',   label: 'हिंदी' },
  { code: 'kannada', label: 'ಕನ್ನಡ' },
  { code: 'bengali', label: 'বাংলা' },
  { code: 'marathi', label: 'मराठी' },
  { code: 'telugu',  label: 'తెలుగు' },
  { code: 'assamese', label: 'অসমীয়া' },
  { code: 'gujarati', label: 'ગુજરાતી' },
  { code: 'malayalam', label: 'മലയാളം' },
  { code: 'punjabi', label: 'ਪੰਜਾਬੀ' },
  { code: 'tamil',   label: 'தமிழ்' },
  { code: 'nepali',  label: 'नेपाली' },
];

export default function LanguageSelector({ selected, onChange, compact = false }: Props) {
  function handleSelect(lang: Language) {
    storageSet(KEYS.LANGUAGE, lang);
    onChange(lang);
  }

  if (compact) {
    // Tiny version for top bar — abbreviations only
    const abbr: Record<Language, string> = {
      english: 'EN',
      hindi: 'हि',
      kannada: 'ಕ',
      bengali: 'বা',
      marathi: 'म',
      telugu: 'తె',
      assamese: 'অ',
      gujarati: 'ગુ',
      malayalam: 'മ',
      punjabi: 'ਪੰ',
      tamil: 'த',
      nepali: 'ने'
    };
    return (
      <div className="flex gap-1">
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => handleSelect(code)}
            title={label}
            style={{
              background: selected === code ? 'rgba(255,255,255,0.25)' : 'transparent',
              color: '#fff',
              border: selected === code ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '15px',
              fontWeight: selected === code ? 700 : 400,
              cursor: 'pointer',
              minWidth: 36,
            }}
          >
            {abbr[code]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 20px',
      }}
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleSelect(code)}
          style={{
            minHeight: 64,
            fontSize: 20,
            fontFamily: 'Georgia, serif',
            fontWeight: selected === code ? 700 : 500,
            background: selected === code ? 'var(--color-teal)' : '#fff',
            color: selected === code ? '#fff' : 'var(--color-teal)',
            border: `2px solid var(--color-teal)`,
            borderRadius: 16,
            padding: '10px 20px',
            cursor: 'pointer',
            boxShadow: selected === code ? '0 4px 14px rgba(26,107,90,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
