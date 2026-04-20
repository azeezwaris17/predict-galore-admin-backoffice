/**
 * Client-side auth cookie helpers
 * Note: This is a transitional bridge until http-only cookies are set by the server.
 */

const AUTH_COOKIE = 'authToken';
const MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Decode a JWT and return its expiry timestamp (seconds since epoch), or null if unreadable.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT is expired (or unreadable).
 */
export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false; // can't determine — don't force logout
  return Date.now() / 1000 >= exp;
}

