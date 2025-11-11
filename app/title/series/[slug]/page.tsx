'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useSession, fetchSeries } from '@/lib/api';
import type { Series } from '@/types';

interface SeriesPageProps {
  params: { slug: string };
}

export default function SeriesPage({ params }: SeriesPageProps) {
  const router = useRouter();
  const { data: session, error, isLoading } = useSession();
  const [serie, setSerie] = useState<Series | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!session) { router.replace('/login'); return; }
    fetchSeries(decodeURIComponent(params.slug))
      .then(setSerie)
      .catch(e => setLoadErr(String(e)));
  }, [isLoading, session, params.slug, router]);

  if (isLoading) return null;
  if (error) return <AppShell><div>Erreur réseau.</div></AppShell>;
  if (!session) return null; // redirigé
  if (loadErr) return <AppShell><div>Introuvable.</div></AppShell>;
  if (!serie) return null;

  return (
    <AppShell>
      <article style={{ display: 'grid', gap: '2rem' }}>
        <header style={{ display: 'grid', gap: '1rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: 0 }}>{serie.title}</h1>
          <p style={{ margin: 0, color: '#b3b3b3', fontSize: '1.1rem' }}>{serie.synopsis}</p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#b3b3b3' }}>
            <span>{serie.genres.join(', ')}</span>
            <span>{serie.seasons.length} saisons</span>
          </div>
        </header>

        {serie.seasons.map(season => (
          <section key={season.season}>
            <h2 style={{ fontSize: '2rem' }}>Saison {season.season}</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
              {season.episodes.map(episode => (
                <li key={`${season.season}-${episode.episode}`} style={{ background: '#121212', borderRadius: 'var(--radius)', padding: '1rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>
                        Épisode {episode.episode}: {episode.title}
                      </strong>
                      <p style={{ margin: '0.5rem 0 0', color: '#b3b3b3' }}>{episode.synopsis}</p>
                    </div>
                    <a
                      href={`/watch?type=series&slug=${serie.slug}&s=${season.season}&e=${episode.episode}`}
                      style={{
                        alignSelf: 'center',
                        padding: '0.6rem 1.2rem',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(229, 9, 20, 0.8)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      ▶ Lire
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </AppShell>
  );
}
