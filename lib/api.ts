'use client';

import useSWR, { mutate } from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import type { Movie, Series, Category, HistoryEntry, SessionInfo, Role, Episode } from '@/types';

// ➜ en prod on force la même origine (pas d'URL absolue http://localhost)
const ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL &&
  !process.env.NEXT_PUBLIC_API_BASE_URL.includes('localhost') &&
  process.env.NEXT_PUBLIC_API_BASE_URL.startsWith('https')
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '')
    : '';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function handleJson<T>(res: Response): Promise<T> {
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    throw new Error(String(msg));
  }
  return data as T;
}

async function http<T>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ORIGIN}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { ...(init.body ? JSON_HEADERS : {}), ...(init.headers || {}) },
    ...init
  });
  return handleJson<T>(res);
}

// ---------- AUTH ----------
export function login(username: string, password: string) {
  const body = { username: DOMPurify.sanitize(username), password };
  return http<SessionInfo>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export async function logout(csrfToken: string) {
  await http('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
  mutate('/api/auth/session');
}

export function useSession() {
  return useSWR<SessionInfo>('/api/auth/session', () => http<SessionInfo>('/api/auth/session'), {
    shouldRetryOnError: false
  });
}

// ---------- DATA HOOKS ----------
export function useMovies() {
  return useSWR<Movie[]>('/api/movies', () => http<Movie[]>('/api/movies'));
}

export function useSeries() {
  return useSWR<Series[]>('/api/series', () => http<Series[]>('/api/series'));
}

export function useCategories() {
  return useSWR<Category[]>('/api/categories', () => http<Category[]>('/api/categories'));
}

export function useHistory() {
  return useSWR<HistoryEntry[]>('/api/history', () => http<HistoryEntry[]>('/api/history'));
}

// ---------- MUTATIONS ----------
export async function updateHistory(entry: HistoryEntry, csrfToken: string) {
  await http('/api/history', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
    body: JSON.stringify(entry)
  });
  mutate('/api/history');
}

export async function fetchMovie(id: string) {
  const movies = await http<Movie[]>('/api/movies');
  return movies.find(m => m.id === id) || null;
}

export async function fetchSeries(slug: string) {
  const list = await http<Series[]>('/api/series');
  return list.find(s => s.slug === slug) || null;
}

export async function ensureRole(required: Role, session: SessionInfo | undefined) {
  if (!session) throw new Error('Not authenticated');
  if (session.role !== required) throw new Error('Not authorized');
}

async function authed<T>(method: string, route: string, body: unknown, csrfToken: string) {
  return http<T>(route, {
    method,
    headers: { 'x-csrf-token': csrfToken },
    body: body ? JSON.stringify(body) : undefined
  });
}

export const createMovie = (movie: Movie, csrf: string) => authed<Movie>('POST', '/api/movies', movie, csrf);
export const updateMovie = (movie: Movie, csrf: string) => authed<Movie>('PUT', `/api/movies/${movie.id}`, movie, csrf);
export async function deleteMovie(id: string, csrfToken: string) {
  await http(`/api/movies/${id}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } });
}

export const createSeries = (series: Series, csrf: string) => authed<Series>('POST', '/api/series', series, csrf);
export const updateSeries = (series: Series, csrf: string) => authed<Series>('PUT', `/api/series/${series.slug}`, series, csrf);
export const upsertEpisode = (slug: string, payload: Episode & { seriesTitle?: string; seriesSynopsis?: string; seriesGenres?: string[]; seriesPosterUrl?: string }, csrf: string) =>
  authed<Series>('POST', `/api/series/${slug}/episodes`, payload, csrf);
export async function deleteSeries(slug: string, csrfToken: string) {
  await http(`/api/series/${slug}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } });
}

export const createCategory = (category: Category, csrf: string) => authed<Category>('POST', '/api/categories', category, csrf);
export const updateCategory = (category: Category, csrf: string) => authed<Category>('PUT', `/api/categories/${category.id}`, category, csrf);
export async function deleteCategory(id: string, csrfToken: string) {
  await http(`/api/categories/${id}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } });
}
