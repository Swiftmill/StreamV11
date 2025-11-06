'use client';

import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { HeroBanner } from '@/components/HeroBanner';
import { ContentRow } from '@/components/ContentRow';
import { ContinueWatchingRow } from '@/components/ContinueWatchingRow';
import { useMovies, useSeries, useCategories, useHistory } from '@/lib/api';

export default function AppHomePage() {
  const { data: movies, isLoading: loadingMovies } = useMovies();
  const { data: series, isLoading: loadingSeries } = useSeries();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: history } = useHistory();

  const heroMovie = useMemo(() => {
    if (!movies || !movies.length) return null;
    return movies.find(movie => movie.featured) ?? movies[0];
  }, [movies]);

  const trendingMovies = useMemo(() => {
    if (!movies) return [];
    return [...movies].sort((a, b) => b.views - a.views).slice(0, 10);
  }, [movies]);

  const newestMovies = useMemo(() => {
    if (!movies) return [];
    return [...movies]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [movies]);

  const newestSeries = useMemo(() => {
    if (!series) return [];
    return [...series]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [series]);

  const featuredMovies = useMemo(() => {
    if (!movies) return [];
    return movies.filter(movie => movie.featured).slice(0, 10);
  }, [movies]);

  return (
    <AppShell>
      {(loadingMovies || loadingSeries || loadingCategories) && (
        <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: 'var(--radius)', marginBottom: '2rem' }} />
      )}
      {heroMovie && <HeroBanner movie={heroMovie} />}
      {history && movies && series && history.length > 0 && (
        <ContinueWatchingRow history={history} movies={movies} series={series} />
      )}
      {trendingMovies.length > 0 && <ContentRow title="Les plus vus" items={trendingMovies} type="movie" />}
      {newestSeries.length > 0 && <ContentRow title="Nouveautés séries" items={newestSeries} type="series" />}
      {categories?.map(category => {
        if (category.id === 'tendances') {
          return <ContentRow key={category.id} title={category.name} type="movie" items={trendingMovies} />;
        }
        if (category.id === 'nouveautes') {
          return <ContentRow key={category.id} title={category.name} type="movie" items={newestMovies} />;
        }
        if (category.id === 'originaux') {
          return <ContentRow key={category.id} title={category.name} type="movie" items={featuredMovies} />;
        }
        return (
          <ContentRow
            key={category.id}
            title={category.name}
            type="movie"
            items={(movies || []).filter(movie => movie.genres.includes(category.name))}
          />
        );
      })}
    </AppShell>
  );
}
