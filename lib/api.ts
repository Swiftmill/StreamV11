'use client';

import useSWR, { mutate } from 'swr';
import DOMPurify from 'isomorphic-dompurify';
import type { Movie, Series, Category, HistoryEntry, SessionInfo, Role, Episode } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

type Fetcher<T> = () => Promise<T>;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(typeof message.error === 'string' ? message.error : response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const body = { username: DOMPurify.sanitize(username), password };
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
    credentials: 'include'
  });
  return handleResponse<SessionInfo>(res);
}

export async function logout(csrfToken: string) {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Logout failed');
  }
  mutate('/api/auth/session');
}

export function useSession() {
  return useSWR<SessionInfo>(
    '/api/auth/session',
    () =>
      fetch(`${API_BASE}/api/auth/session`, {
        credentials: 'include'
      }).then(res => handleResponse<SessionInfo>(res)),
    { shouldRetryOnError: false }
  );
}

export function useMovies() {
  return useSWR<Movie[]>(
    '/api/movies',
    () =>
      fetch(`${API_BASE}/api/movies`, {
        credentials: 'include'
      }).then(res => handleResponse<Movie[]>(res))
  );
}

export function useSeries() {
  return useSWR<Series[]>(
    '/api/series',
    () =>
      fetch(`${API_BASE}/api/series`, {
        credentials: 'include'
      }).then(res => handleResponse<Series[]>(res))
  );
}

export function useCategories() {
  return useSWR<Category[]>(
    '/api/categories',
    () =>
      fetch(`${API_BASE}/api/categories`, {
        credentials: 'include'
      }).then(res => handleResponse<Category[]>(res))
  );
}

export function useHistory() {
  return useSWR<HistoryEntry[]>(
    '/api/history',
    () =>
      fetch(`${API_BASE}/api/history`, {
        credentials: 'include'
      }).then(res => handleResponse<HistoryEntry[]>(res))
  );
}

export async function updateHistory(entry: HistoryEntry, csrfToken: string) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'x-csrf-token': csrfToken },
    body: JSON.stringify(entry),
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Failed to update history');
  }
  mutate('/api/history');
}

export async function fetchMovie(id: string) {
  const movies = await fetch(`${API_BASE}/api/movies`, { credentials: 'include' }).then(res => handleResponse<Movie[]>(res));
  return movies.find(movie => movie.id === id) || null;
}

export async function fetchSeries(slug: string) {
  const series = await fetch(`${API_BASE}/api/series`, { credentials: 'include' }).then(res => handleResponse<Series[]>(res));
  return series.find(item => item.slug === slug) || null;
}

export async function ensureRole(required: Role, session: SessionInfo | undefined) {
  if (!session) {
    throw new Error('Not authenticated');
  }
  if (session.role !== required) {
    throw new Error('Not authorized');
  }
}


async function authorizedRequest<T>(method: string, route: string, body: unknown, csrfToken: string) {
  const res = await fetch(`${API_BASE}${route}`, {
    method,
    headers: { ...JSON_HEADERS, 'x-csrf-token': csrfToken },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });
  return handleResponse<T>(res);
}

export async function createMovie(movie: Movie, csrfToken: string) {
  return authorizedRequest<Movie>('POST', '/api/movies', movie, csrfToken);
}

export async function updateMovie(movie: Movie, csrfToken: string) {
  return authorizedRequest<Movie>('PUT', `/api/movies/${movie.id}`, movie, csrfToken);
}

export async function deleteMovie(id: string, csrfToken: string) {
  const res = await fetch(`${API_BASE}/api/movies/${id}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Suppression impossible');
  }
}

export async function createSeries(series: Series, csrfToken: string) {
  return authorizedRequest<Series>('POST', '/api/series', series, csrfToken);
}

export async function updateSeries(series: Series, csrfToken: string) {
  return authorizedRequest<Series>('PUT', `/api/series/${series.slug}`, series, csrfToken);
}

export async function upsertEpisode(slug: string, payload: Episode & { seriesTitle?: string; seriesSynopsis?: string; seriesGenres?: string[]; seriesPosterUrl?: string }, csrfToken: string) {
  return authorizedRequest<Series>('POST', `/api/series/${slug}/episodes`, payload, csrfToken);
}

export async function deleteSeries(slug: string, csrfToken: string) {
  const res = await fetch(`${API_BASE}/api/series/${slug}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Suppression impossible');
  }
}

export async function createCategory(category: Category, csrfToken: string) {
  return authorizedRequest<Category>('POST', '/api/categories', category, csrfToken);
}

export async function updateCategory(category: Category, csrfToken: string) {
  return authorizedRequest<Category>('PUT', `/api/categories/${category.id}`, category, csrfToken);
}

export async function deleteCategory(id: string, csrfToken: string) {
  const res = await fetch(`${API_BASE}/api/categories/${id}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Suppression impossible');
  }
}
