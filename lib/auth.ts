// lib/auth.ts
// Client-side auth utilities

// User info stored in localStorage for UI display purposes only
// Actual authentication is handled by HTTP-only cookie (kc_auth_token)
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor';
}

const USER_STORAGE_KEY = 'kc_user_info';

/**
 * Get current user info for UI display
 * Note: This is NOT for authentication - that's handled by the HTTP-only cookie
 */
export function getCurrentUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(USER_STORAGE_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Save user info for UI display after login
 */
export function setCurrentUser(user: UserInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Sign out - clear local storage and call logout API to clear HTTP-only cookie
 */
export async function signOut(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_STORAGE_KEY);
    // Also remove old cookie-based storage if exists
    localStorage.removeItem("kc_user");
    sessionStorage.clear();
    
    // Call logout API to clear the HTTP-only cookie
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use signOut() instead
 */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem("kc_user");
    sessionStorage.clear();
  }
}