'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useMovies, useSeries, useSession, updateHistory } from '@/lib/api';
import type { Episode, Movie, Season, Series } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type SeriesSelection = { serie: Series; season: Season; episode: Episode };
type Selection = Movie | SeriesSelection | null;

export default function WatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: movies } = useMovies();
  const { data: series } = useSeries();
  const [autoAdvance, setAutoAdvance] = useState(true);
  const lastUpdateRef = useRef(0);

  const type = searchParams.get('type');
  const movieId = searchParams.get('id');
  const slug = searchParams.get('slug');
  const seasonParam = Number(searchParams.get('s')) || 1;
  const episodeParam = Number(searchParams.get('e')) || 1;

  const selected = useMemo<Selection>(() => {
    if (type === 'movie' && movieId && movies) {
      return movies.find(item => item.id === movieId) || null;
    }
    if (type === 'series' && slug && series) {
      const serie = series.find(item => item.slug === slug);
      if (!serie) return null;
      const season = serie.seasons.find(s => s.season === seasonParam) ?? serie.seasons[0];
      const episode = season?.episodes.find(ep => ep.episode === episodeParam) ?? season?.episodes[0];
      return season && episode ? { serie, season, episode } : null;
    }
    return null;
  }, [type, movieId, movies, slug, series, seasonParam, episodeParam]);

  useEffect(() => {
    if (!selected) {
      router.replace('/app');
    }
  }, [selected, router]);

  function handleProgress(current: number, duration: number) {
    if (!session || !selected) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < 5000) {
      return;
    }
    lastUpdateRef.current = now;
    const progress = duration ? Math.min(current / duration, 0.999) : 0;
    if (type === 'movie' && typeof movieId === 'string' && 'id' in selected) {
      updateHistory(
        {
          contentId: movieId,
          type: 'movie',
          progress,
          lastWatched: new Date().toISOString()
        },
        session.csrfToken
      ).catch(() => undefined);
    }
    if (type === 'series' && !('id' in selected)) {
      updateHistory(
        {
          contentId: selected.serie.slug,
          type: 'series',
          progress,
          lastWatched: new Date().toISOString(),
          season: selected.season.season,
          episode: selected.episode.episode
        },
        session.csrfToken
      ).catch(() => undefined);
    }
  }

  function handleEnded() {
    if (!session || !selected) {
      return;
    }
    if (type === 'movie' && 'id' in selected) {
      updateHistory(
        {
          contentId: selected.id,
          type: 'movie',
          progress: 1,
          lastWatched: new Date().toISOString()
        },
        session.csrfToken
      ).catch(() => undefined);
      return;
    }
    if (type === 'series' && !('id' in selected)) {
      updateHistory(
        {
          contentId: selected.serie.slug,
          type: 'series',
          progress: 1,
          lastWatched: new Date().toISOString(),
          season: selected.season.season,
          episode: selected.episode.episode
        },
        session.csrfToken
      ).catch(() => undefined);
      if (!autoAdvance) {
        return;
      }
      const { serie, season, episode } = selected;
      const episodes = season.episodes;
      const currentIndex = episodes.findIndex(ep => ep.episode === episode.episode);
      if (currentIndex < episodes.length - 1) {
        const nextEpisode = episodes[currentIndex + 1];
        router.replace(`/watch?type=series&slug=${serie.slug}&s=${season.season}&e=${nextEpisode.episode}`);
        return;
      }
      const seasonIndex = serie.seasons.findIndex(s => s.season === season.season);
      if (seasonIndex < serie.seasons.length - 1) {
        const nextSeason = serie.seasons[seasonIndex + 1];
        const firstEpisode = nextSeason.episodes[0];
        if (firstEpisode) {
          router.replace(`/watch?type=series&slug=${serie.slug}&s=${nextSeason.season}&e=${firstEpisode.episode}`);
        }
      }
    }
  }

  if (!selected) {
    return null;
  }

  const playerKey = type === 'movie' ? movieId : `${slug}-${seasonParam}-${episodeParam}`;

  const source =
    type === 'movie' && selected && 'id' in selected
      ? {
          src: selected.streamUrl,
          type: 'movie' as const,
          title: selected.title,
          subtitles: selected.subtitles,
          poster: selected.posterUrl
        }
      : !('id' in selected)
      ? {
          src: selected.episode.streamUrl,
          type: 'series' as const,
          title: `${selected.serie.title} · S${selected.season.season}E${selected.episode.episode}`,
          subtitles: selected.episode.subtitles,
          poster: selected.serie.posterUrl
        }
      : null;

  useEffect(() => {
    if (!session || !source) {
      return;
    }
    const payload =
      type === 'movie' && selected && 'id' in selected
        ? { contentId: selected.id, type: 'movie' as const }
        : !('id' in selected)
        ? { contentId: selected.serie.slug, type: 'series' as const }
        : null;
    if (!payload) {
      return;
    }
    fetch(`${API_BASE}/api/metrics/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: JSON.stringify(payload),
      credentials: 'include'
    }).catch(() => undefined);
  }, [session, source, playerKey, selected, type]);

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>{source?.title}</h1>
            {type === 'series' && !('id' in selected) && (
              <p style={{ margin: '0.5rem 0 0', color: '#b3b3b3' }}>{selected.episode.synopsis}</p>
            )}
          </div>
          {type === 'series' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={autoAdvance} onChange={event => setAutoAdvance(event.target.checked)} />
              Lancer l&apos;épisode suivant automatiquement
            </label>
          )}
        </header>
        {source && (
          <VideoPlayer key={playerKey} source={source} onTimeUpdate={handleProgress} onEnded={handleEnded} />
        )}
      </div>
    </AppShell>
  );
}
