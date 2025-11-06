export type Role = 'admin' | 'user';

export interface Subtitle {
  lang: string;
  url: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  releaseYear: number;
  duration: number;
  genres: string[];
  rating: string;
  posterUrl: string;
  streamUrl: string;
  subtitles: Subtitle[];
  createdAt: string;
  updatedAt: string;
  published: boolean;
  featured: boolean;
  views: number;
}

export interface Episode {
  season: number;
  episode: number;
  title: string;
  synopsis: string;
  duration: number;
  streamUrl: string;
  subtitles: Subtitle[];
  releaseDate: string;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface Series {
  slug: string;
  title: string;
  synopsis: string;
  genres: string[];
  posterUrl: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  featured: boolean;
  views: number;
  seasons: Season[];
}

export interface Category {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  contentId: string;
  type: 'movie' | 'series';
  progress: number;
  lastWatched: string;
  season?: number;
  episode?: number;
}

export interface SessionInfo {
  username: string;
  role: Role;
  csrfToken: string;
}
