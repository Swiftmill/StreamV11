'use client';

import { AppShell } from '@/components/AppShell';
import { useMovies } from '@/lib/api';
import { ContentRow } from '@/components/ContentRow';

export default function MoviesListingPage() {
  const { data: movies, isLoading } = useMovies();

  return (
    <AppShell>
      <section style={{ display: 'grid', gap: '2rem' }}>
        <header>
          <h1 style={{ fontSize: '2.5rem' }}>Tous les films</h1>
          <p style={{ color: '#b3b3b3' }}>
            Parcourez le catalogue complet de films et filtrez selon vos envies.
          </p>
        </header>
        {isLoading && <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius)' }} />}
        {movies && <ContentRow title="Catalogue" items={movies} type="movie" />}
      </section>
    </AppShell>
  );
}
