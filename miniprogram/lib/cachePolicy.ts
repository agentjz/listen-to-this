export const CACHE_KEYS = {
  session: 'listen.session',
  syncData: 'listen.syncData'
} as const;

export function isFreshCache(updatedAt: number, now: number, maxAgeMs: number): boolean {
  return now >= updatedAt && now - updatedAt <= maxAgeMs;
}
