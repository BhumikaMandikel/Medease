import { HealthProfile, ProfilePatchRequest } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch the health profile from the backend.
 * Returns null on error (silent failure).
 */
export async function fetchProfile(): Promise<HealthProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    // Silent failure - never surface errors to user
    console.warn('Profile fetch failed:', error);
    return null;
  }
}

/**
 * Check if a profile exists with a name set.
 * Returns false on error (silent failure).
 */
export async function checkProfileExists(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/exists`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.exists || false;
  } catch (error) {
    console.warn('Profile exists check failed:', error);
    return false;
  }
}

/**
 * Create or fully replace the profile.
 * Returns the created profile or null on error (silent failure).
 */
export async function createProfile(profile: HealthProfile): Promise<HealthProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Profile creation failed:', error);
    return null;
  }
}

/**
 * Merge partial updates into the profile.
 * Returns the updated profile or null on error (silent failure).
 */
export async function patchProfile(patch: ProfilePatchRequest): Promise<HealthProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Profile patch failed:', error);
    return null;
  }
}

/**
 * Mark a monitoring test as done.
 * Returns true on success, false on error (silent failure).
 */
export async function markMonitoringDone(testName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/monitoring/${encodeURIComponent(testName)}/done`, {
      method: 'PATCH',
    });
    return response.ok;
  } catch (error) {
    console.warn('Mark monitoring done failed:', error);
    return false;
  }
}


