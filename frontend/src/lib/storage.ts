// localStorage keys
export const KEYS = {
  LANGUAGE: 'medease_language',
  PHASE: 'medease_phase',
  DOCUMENT_NAME: 'medease_document_name',
  DOCUMENT_DATA: 'medease_document_data',
  DOCUMENT_TYPE: 'medease_document_type',
  ANALYSIS_RESULT: 'medease_analysis_result',
  MESSAGES: 'medease_messages',
  OUTPUT_MODE: 'medease_output_mode',
  GOOGLE_TOKEN: 'medease_google_token',
  GOOGLE_TOKEN_EXPIRY: 'medease_google_token_expiry',
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];

// Callback to show banner when quota exceeded — set by App on mount
let onQuotaExceeded: (() => void) | null = null;

export function setQuotaCallback(cb: () => void) {
  onQuotaExceeded = cb;
}

export function storageGet(key: StorageKey): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: StorageKey, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: unknown) {
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      onQuotaExceeded?.();
    }
    return false;
  }
}

export function storageRemove(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Clear all document-related keys (keep language, output_mode, google token) */
export function clearDocumentKeys(): void {
  storageRemove(KEYS.PHASE);
  storageRemove(KEYS.DOCUMENT_NAME);
  storageRemove(KEYS.DOCUMENT_DATA);
  storageRemove(KEYS.DOCUMENT_TYPE);
  storageRemove(KEYS.ANALYSIS_RESULT);
  storageRemove(KEYS.MESSAGES);
}