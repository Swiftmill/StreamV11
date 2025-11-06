import { cookies } from 'next/headers';
import type { Movie, Series, Category, SessionInfo } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

function buildCookieHeader() {
  const store = cookies();
  return store
    .getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

async function serverFetch<T>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Cookie: buildCookieHeader()
    },
    credentials: 'include',
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getServerSession() {
  try {
    return await serverFetch<SessionInfo>('/api/auth/session');
  } catch {
    return null;
  }
}

export async function getServerMovies() {
  return serverFetch<Movie[]>('/api/movies');
}

export async function getServerSeries() {
  return serverFetch<Series[]>('/api/series');
}

export async function getServerCategories() {
  return serverFetch<Category[]>('/api/categories');
}
