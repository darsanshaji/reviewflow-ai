/**
 * ReviewFlow AI - Security API Rate Limiting Helper
 * In-memory client request limiting registry (upgrades to Redis in V2 roadmap)
 */

interface RateLimitEntry {
  requests: number;
  resetTime: number;
}

const registry = new Map<string, RateLimitEntry>();

// Limit: 60 requests per minute
const LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

export function isRateLimited(ipAddress: string): { limited: boolean; remaining: number; reset: number } {
  const now = Date.now();
  let entry = registry.get(ipAddress);

  if (!entry || now > entry.resetTime) {
    // Initialize or reset window
    entry = {
      requests: 0,
      resetTime: now + LIMIT_WINDOW_MS
    };
  }

  entry.requests += 1;
  registry.set(ipAddress, entry);

  const remaining = Math.max(0, MAX_REQUESTS - entry.requests);
  const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

  if (entry.requests > MAX_REQUESTS) {
    return {
      limited: true,
      remaining: 0,
      reset: resetSeconds
    };
  }

  return {
    limited: false,
    remaining,
    reset: resetSeconds
  };
}
