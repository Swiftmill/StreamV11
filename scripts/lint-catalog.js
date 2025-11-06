#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CATALOG_DIR = path.join(DATA_DIR, 'catalog');
const SERIES_DIR = path.join(CATALOG_DIR, 'series');

const subtitleSchema = z.object({
  lang: z.string().min(2).max(8),
  url: z.string().url()
});

const movieSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  releaseYear: z.number().int().min(1900),
  duration: z.number().int().positive(),
  genres: z.array(z.string().min(1)).min(1),
  rating: z.string().min(1),
  posterUrl: z.string().url(),
  streamUrl: z.string().url(),
  subtitles: z.array(subtitleSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  published: z.boolean(),
  featured: z.boolean(),
  views: z.number().int().nonnegative()
});

const episodeSchema = z.object({
  season: z.number().int().min(1),
  episode: z.number().int().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  duration: z.number().int().positive(),
  streamUrl: z.string().url(),
  subtitles: z.array(subtitleSchema),
  releaseDate: z.string().datetime()
});

const seriesSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  genres: z.array(z.string().min(1)).min(1),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  published: z.boolean(),
  featured: z.boolean(),
  views: z.number().int().nonnegative(),
  seasons: z
    .array(
      z.object({
        season: z.number().int().min(1),
        episodes: z.array(episodeSchema).min(1)
      })
    )
    .min(1)
});

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

function readJSON(file) {
  const content = fs.readFileSync(file, 'utf-8');
  return JSON.parse(content);
}

function lintMovies() {
  const file = path.join(CATALOG_DIR, 'movies.json');
  const payload = readJSON(file);
  z.object({ movies: z.array(movieSchema) }).parse(payload);
}

function lintCategories() {
  const file = path.join(CATALOG_DIR, 'categories.json');
  const payload = readJSON(file);
  z.object({ categories: z.array(categorySchema) }).parse(payload);
}

function lintSeries() {
  const entries = fs.readdirSync(SERIES_DIR).filter(name => name.endsWith('.json'));
  for (const entry of entries) {
    const payload = readJSON(path.join(SERIES_DIR, entry));
    seriesSchema.parse(payload);
  }
}

function main() {
  lintMovies();
  lintCategories();
  lintSeries();
  console.log('Catalog validated successfully.');
}

main();
