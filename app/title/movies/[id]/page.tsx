'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useSession, fetchMovie } from '@/lib/api';
import type { Movie } from '@/types';

interface MoviePageProps {
  params: { id: string };
}

export default function MoviePage({ params }: MoviePageProps) {
  const router = useRouter();
  const { data: session, error, isLoading } = useSession();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) { router.replace('/login'); return; }
    fetchMovie(decodeURIComponent(params.id))
      .then(setMovie)
      .catch(e => setLoadErr(String(e)));
  }, [isLoading, session, params.id, router]);

  if (isLoading) return null;
  if (error) return <AppShell><div>Erreur réseau.</div></AppShell>;
  if (!session) return null; // redirigé
  if (loadErr) return <AppShell><div>Introuvable.</div></AppShell>;
  if (!movie) return null;

  return (
    <AppShell>
      <article style={{ display: 'grid', gap: '2rem' }}>
        <header style={{ display: 'grid', gap: '1rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: 0 }}>{movie.title}</h1>
          <p style={{ margin: 0, color: '#b3b3b3', fontSize: '1.1rem' }}>{movie.description}</p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#b3b3b3' }}>
            <span>{movie.releaseYear}</span>
            <span>{movie.duration} min</span>
            <span>{movie.rating}</span>
            <span>{movie.genres.join(', ')}</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a
              href={`/watch?type=movie&id=${movie.id}`}
              style={{
                padding: '0.9rem 1.4rem',
                borderRadius: 'var(--radius)',
                background: 'var(--accent)',
                color: 'white',
                fontWeight: 700
              }}
            >
              ▶ Regarder maintenant
            </a>
          </div>
        </header>
        <section>
          <h2 style={{ fontSize: '1.5rem' }}>Sous-titres disponibles</h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '1rem' }}>
            {movie.subtitles.map(sub => (
              <li key={sub.lang} style={{ background: '#111', padding: '0.75rem 1rem', borderRadius: 'var(--radius)' }}>
                {sub.lang.toUpperCase()}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </AppShell>
  );
}
