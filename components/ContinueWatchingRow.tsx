'use client';

import Link from 'next/link';
import type { HistoryEntry, Movie, Series } from '@/types';

interface ContinueWatchingRowProps {
  history: HistoryEntry[];
  movies: Movie[];
  series: Series[];
}

export function ContinueWatchingRow({ history, movies, series }: ContinueWatchingRowProps) {
  if (!history.length) {
    return null;
  }
  const items = history
    .slice()
    .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
    .map(entry => {
      if (entry.type === 'movie') {
        const movie = movies.find(item => item.id === entry.contentId);
        if (!movie) return null;
        return {
          title: movie.title,
          subtitle: `${Math.round(entry.progress * 100)}% visionné`,
          href: `/watch?type=movie&id=${movie.id}`
        };
      }
      const serie = series.find(item => item.slug === entry.contentId);
      if (!serie) return null;
      const label = entry.season && entry.episode ? `S${entry.season}E${entry.episode}` : 'Série';
      return {
        title: serie.title,
        subtitle: `${label} · ${Math.round(entry.progress * 100)}%`,
        href: `/watch?type=series&slug=${serie.slug}${entry.season ? `&s=${entry.season}` : ''}${entry.episode ? `&e=${entry.episode}` : ''}`
      };
    })
    .filter(Boolean) as { title: string; subtitle: string; href: string }[];

  if (!items.length) {
    return null;
  }

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Continuer la lecture</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
        {items.map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                background: '#131313',
                borderRadius: 'var(--radius)',
                border: '1px solid #1f1f1f'
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <p style={{ margin: 0, color: '#9a9a9a' }}>{item.subtitle}</p>
              </div>
              <span aria-hidden>▶</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
