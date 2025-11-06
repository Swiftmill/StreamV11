'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import {
  useMovies,
  useSeries,
  useCategories,
  useSession,
  createCategory,
  createMovie,
  deleteCategory,
  deleteMovie,
  deleteSeries,
  upsertEpisode
} from '@/lib/api';
import type { Movie } from '@/types';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function AdminDashboard() {
  const { data: session } = useSession();
  const { data: categories, mutate: mutateCategories } = useCategories();
  const { data: movies, mutate: mutateMovies } = useMovies();
  const { data: series, mutate: mutateSeries } = useSeries();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    releaseYear: new Date().getFullYear().toString(),
    duration: '120',
    genres: 'Action,Drama',
    rating: '13+',
    posterUrl: '',
    streamUrl: '',
    subtitles: 'fr:https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    order: '0'
  });

  const [episodeForm, setEpisodeForm] = useState({
    seriesTitle: '',
    seriesSlug: '',
    seriesPosterUrl: '',
    seriesGenres: 'Drama',
    seriesSynopsis: '',
    season: '1',
    episode: '1',
    title: '',
    synopsis: '',
    duration: '45',
    streamUrl: '',
    subtitles: 'fr:https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt',
    releaseDate: new Date().toISOString()
  });

  const csrfToken = session?.csrfToken;

  async function handleCreateMovie(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setMessage('');
    setError('');
    try {
      const now = new Date().toISOString();
      const movie: Movie = {
        id: slugify(movieForm.title),
        title: DOMPurify.sanitize(movieForm.title),
        description: DOMPurify.sanitize(movieForm.description),
        releaseYear: Number(movieForm.releaseYear),
        duration: Number(movieForm.duration),
        genres: movieForm.genres.split(',').map(item => DOMPurify.sanitize(item.trim())).filter(Boolean),
        rating: DOMPurify.sanitize(movieForm.rating),
        posterUrl: movieForm.posterUrl,
        streamUrl: movieForm.streamUrl,
        subtitles: movieForm.subtitles
          .split(',')
          .map(pair => pair.trim())
          .filter(Boolean)
          .map(entry => {
            const [lang, url] = entry.split(':');
            return { lang: DOMPurify.sanitize(lang), url: url?.trim() ?? '' };
          }),
        createdAt: now,
        updatedAt: now,
        published: true,
        featured: false,
        views: 0
      };
      await createMovie(movie, csrfToken);
      await mutateMovies();
      setMessage(`Film ${movie.title} créé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du film');
    }
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setMessage('');
    setError('');
    try {
      const now = new Date().toISOString();
      const category = {
        id: slugify(categoryForm.name),
        name: DOMPurify.sanitize(categoryForm.name),
        order: Number(categoryForm.order),
        createdAt: now,
        updatedAt: now
      };
      await createCategory(category, csrfToken);
      await mutateCategories();
      setMessage(`Catégorie ${category.name} créée.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la catégorie');
    }
  }

  async function handleCreateEpisode(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setMessage('');
    setError('');
    try {
      await upsertEpisode(
        episodeForm.seriesSlug || slugify(episodeForm.seriesTitle),
        {
          season: Number(episodeForm.season),
          episode: Number(episodeForm.episode),
          title: DOMPurify.sanitize(episodeForm.title),
          synopsis: DOMPurify.sanitize(episodeForm.synopsis),
          duration: Number(episodeForm.duration),
          streamUrl: episodeForm.streamUrl,
          subtitles: episodeForm.subtitles
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => {
              const [lang, url] = value.split(':');
              return { lang: DOMPurify.sanitize(lang), url: url?.trim() ?? '' };
            }),
          releaseDate: episodeForm.releaseDate,
          seriesTitle: DOMPurify.sanitize(episodeForm.seriesTitle),
          seriesPosterUrl: episodeForm.seriesPosterUrl,
          seriesGenres: episodeForm.seriesGenres.split(',').map(item => DOMPurify.sanitize(item.trim())).filter(Boolean),
          seriesSynopsis: DOMPurify.sanitize(episodeForm.seriesSynopsis)
        },
        csrfToken
      );
      await mutateSeries();
      setMessage(`Épisode ${episodeForm.title} enregistré.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'épisode');
    }
  }

  const sortedMovies = useMemo(() => (movies ? [...movies].sort((a, b) => a.title.localeCompare(b.title)) : []), [movies]);
  const sortedSeries = useMemo(() => (series ? [...series].sort((a, b) => a.title.localeCompare(b.title)) : []), [series]);

  return (
    <div style={{ display: 'grid', gap: '2.5rem' }}>
      <header>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Administration</h1>
        <p style={{ color: '#b3b3b3' }}>
          Gérez le catalogue, les catégories et les épisodes. Les actions sont journalisées dans l&apos;audit.
        </p>
        {message && <p style={{ color: '#6be585' }}>{message}</p>}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
      </header>

      <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2>Nouvelle catégorie</h2>
        <form onSubmit={handleCreateCategory} style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
          <label style={{ display: 'grid', gap: '0.5rem' }}>
            Nom
            <input
              required
              value={categoryForm.name}
              onChange={event => setCategoryForm(prev => ({ ...prev, name: event.target.value }))}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #2a2a2a', background: '#111', color: 'inherit' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.5rem' }}>
            Ordre
            <input
              required
              type="number"
              min={0}
              value={categoryForm.order}
              onChange={event => setCategoryForm(prev => ({ ...prev, order: event.target.value }))}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #2a2a2a', background: '#111', color: 'inherit' }}
            />
          </label>
          <button type="submit" style={{ padding: '0.8rem', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 600 }}>
            Créer la catégorie
          </button>
        </form>
        <ul style={{ marginTop: '1.5rem', listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
          {categories?.map(category => (
            <li key={category.id} style={{ background: '#111', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{category.name}</span>
              <button
                type="button"
                onClick={async () => {
                  if (!csrfToken) return;
                  try {
                    await deleteCategory(category.id, csrfToken);
                    await mutateCategories();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Impossible de supprimer la catégorie');
                  }
                }}
                style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '0.4rem 0.8rem', borderRadius: '999px' }}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2>Ajouter un film</h2>
        <form onSubmit={handleCreateMovie} style={{ display: 'grid', gap: '1rem', maxWidth: 640 }}>
          {Object.entries(movieForm).map(([key, value]) => (
            <label key={key} style={{ display: 'grid', gap: '0.5rem' }}>
              {key}
              <input
                required={key !== 'subtitles'}
                value={value}
                onChange={event => setMovieForm(prev => ({ ...prev, [key]: event.target.value }))}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #2a2a2a', background: '#111', color: 'inherit' }}
              />
            </label>
          ))}
          <button type="submit" style={{ padding: '0.8rem', borderRadius: 'var(--radius)', border: 'none', background: '#17b169', color: 'white', fontWeight: 600 }}>
            Publier le film
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
          {sortedMovies.map(movie => (
            <div key={movie.id} style={{ background: '#111', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{movie.title}</span>
              <button
                type="button"
                onClick={async () => {
                  if (!csrfToken) return;
                  try {
                    await deleteMovie(movie.id, csrfToken);
                    await mutateMovies();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Impossible de supprimer le film');
                  }
                }}
                style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '0.4rem 0.8rem', borderRadius: '999px' }}
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <h2>Ajouter / Mettre à jour un épisode</h2>
        <form onSubmit={handleCreateEpisode} style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
          {Object.entries(episodeForm).map(([key, value]) => (
            <label key={key} style={{ display: 'grid', gap: '0.5rem' }}>
              {key}
              <input
                required
                value={value}
                onChange={event => setEpisodeForm(prev => ({ ...prev, [key]: event.target.value }))}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid #2a2a2a', background: '#111', color: 'inherit' }}
              />
            </label>
          ))}
          <button type="submit" style={{ padding: '0.8rem', borderRadius: 'var(--radius)', border: 'none', background: '#e58f17', color: 'white', fontWeight: 600 }}>
            Enregistrer l&apos;épisode
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          {sortedSeries.map(item => (
            <div key={item.slug} style={{ background: '#111', padding: '0.75rem 1rem', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{item.title}</strong>
                <button
                  type="button"
                  onClick={async () => {
                    if (!csrfToken) return;
                    try {
                      await deleteSeries(item.slug, csrfToken);
                      await mutateSeries();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Impossible de supprimer la série');
                    }
                  }}
                  style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '0.4rem 0.8rem', borderRadius: '999px' }}
                >
                  Supprimer
                </button>
              </div>
              <p style={{ color: '#b3b3b3', marginTop: '0.5rem' }}>{item.seasons.length} saisons</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
