import { useQuery } from '@tanstack/react-query';
import { CandidatesResponse } from '../types';

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useCandidates() {
  return useQuery<CandidatesResponse>({
    queryKey: ['candidates'],
    queryFn: () => fetchJSON<CandidatesResponse>('/api/candidates'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => fetchJSON<Record<string, unknown>>('/api/health'),
    refetchInterval: 30_000,
  });
}

export async function triggerRefresh(): Promise<{ message: string; status: string }> {
  const res = await fetch(`${BASE_URL}/api/refresh`);
  return res.json() as Promise<{ message: string; status: string }>;
}
