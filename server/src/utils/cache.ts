import NodeCache from 'node-cache';

const defaultCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export function getCached<T>(key: string, ttlSeconds?: number): T | undefined {
  return defaultCache.get<T>(key);
}

export function setCached<T>(key: string, value: T, ttlSeconds?: number): void {
  if (ttlSeconds !== undefined) {
    defaultCache.set(key, value, ttlSeconds);
  } else {
    defaultCache.set(key, value);
  }
}

export function deleteCached(key: string): void {
  defaultCache.del(key);
}

export function flushCache(): void {
  defaultCache.flushAll();
}
