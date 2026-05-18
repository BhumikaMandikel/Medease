import { KEYS, storageGet, storageSet } from './storage';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient: any = null;

function getTokenClient(callback: (token: string) => void) {
  if (!tokenClient) {
    tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response: any) => {
        if (response.error) {
          console.error('Google OAuth error:', response.error);
          return;
        }
        const token: string = response.access_token;
        const expiresIn: number = parseInt(response.expires_in ?? '3600', 10);
        const expiry = Date.now() + expiresIn * 1000;
        storageSet(KEYS.GOOGLE_TOKEN, token);
        storageSet(KEYS.GOOGLE_TOKEN_EXPIRY, String(expiry));
        callback(token);
      },
    });
  }
  return tokenClient;
}

export function connectGoogleCalendar(onSuccess: (token: string) => void): void {
  const client = getTokenClient(onSuccess);
  if (!client) {
    console.error('Google Identity Services not loaded.');
    return;
  }
  client.requestAccessToken();
}

export function getGoogleToken(): string | null {
  const token = storageGet(KEYS.GOOGLE_TOKEN);
  const expiryStr = storageGet(KEYS.GOOGLE_TOKEN_EXPIRY);
  if (!token || !expiryStr) return null;
  const expiry = parseInt(expiryStr, 10);
  if (Date.now() > expiry) {
    // Expired
    return null;
  }
  return token;
}

export function isGoogleConnected(): boolean {
  return getGoogleToken() !== null;
}

export function disconnectGoogleCalendar(): void {
  // Get the token before removing it
  const token = storageGet(KEYS.GOOGLE_TOKEN);
  
  // Remove from storage
  storageSet(KEYS.GOOGLE_TOKEN, '');
  storageSet(KEYS.GOOGLE_TOKEN_EXPIRY, '');
  
  // Revoke the token with Google (optional but recommended)
  if (token && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {
        console.log('Token revoked successfully');
      });
    } catch (e) {
      console.warn('Failed to revoke token:', e);
    }
  }
}