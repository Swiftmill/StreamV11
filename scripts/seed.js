#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const lockfile = require('proper-lockfile');

// --- Paths ----------------------------------------------------
const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const HISTORY_DIR = path.join(USERS_DIR, 'history');
const CATALOG_DIR = path.join(DATA_DIR, 'catalog');
const SERIES_DIR = path.join(CATALOG_DIR, 'series');

// --- Hash (admin123, cost=10) --------------------------------
const ADMIN_HASH = '$2b$10$3oe.r613HnFvypFdqorR7eIU.56vMu.fSdyU4nvqBgCKNTHfHlaxq';
const USER_HASH  = '$2b$10$3oe.r613HnFvypFdqorR7eIU.56vMu.fSdyU4nvqBgCKNTHfHlaxq';

const FORCE = process.argv.includes('--force');

// --- Sample catalog -------------------------------------------
const movies = [
  {
    id: 'the-irishman',
    title: 'The Irishman',
    description: 'A mob hitman recalls his possible involvement with the slaying of Jimmy Hoffa.',
    releaseYear: 2019, duration: 209,
    genres: ['Crime','Drama'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/the-irishman.jpg',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    subtitles: [{ lang: 'en', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt' }],
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    published: true, featured: true, views: 0
  },
  {
    id: 'roma',
    title: 'Roma',
    description: 'Cleo, a domestic worker, helps her employer Sofía raise four children in 1970s Mexico City.',
    releaseYear: 2018, duration: 135,
    genres: ['Drama'], rating: 'PG-13',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/roma.jpg',
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    subtitles: [{ lang: 'es', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/spa.vtt' }],
    createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'bird-box',
    title: 'Bird Box',
    description: 'A mysterious force decimates the population, only one thing is certain: if you see it, you die.',
    releaseYear: 2018, duration: 124,
    genres: ['Thriller'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/bird-box.jpg',
    streamUrl: 'https://test-streams.mux.dev/playlist.m3u8',
    subtitles: [{ lang: 'fr', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/fra.vtt' }],
    createdAt: '2024-01-03T00:00:00.000Z', updatedAt: '2024-01-03T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'okja',
    title: 'Okja',
    description: 'A young girl risks everything to prevent a powerful company from abducting her best friend.',
    releaseYear: 2017, duration: 120,
    genres: ['Adventure','Drama'], rating: 'PG-13',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/okja.jpg',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    subtitles: [{ lang: 'ko', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/kor.vtt' }],
    createdAt: '2024-01-04T00:00:00.000Z', updatedAt: '2024-01-04T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'marriage-story',
    title: 'Marriage Story',
    description: 'A stage director and an actor struggle through a grueling divorce that pushes them to their limits.',
    releaseYear: 2019, duration: 137,
    genres: ['Drama'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/marriage-story.jpg',
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    subtitles: [{ lang: 'en', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt' }],
    createdAt: '2024-01-05T00:00:00.000Z', updatedAt: '2024-01-05T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'da-5-bloods',
    title: 'Da 5 Bloods',
    description: 'Four African American vets battle the forces of man and nature when they return to Vietnam.',
    releaseYear: 2020, duration: 154,
    genres: ['War','Drama'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/da-5-bloods.jpg',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    subtitles: [{ lang: 'en', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt' }],
    createdAt: '2024-01-06T00:00:00.000Z', updatedAt: '2024-01-06T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'extraction',
    title: 'Extraction',
    description: 'A fearless black market mercenary embarks on the deadliest extraction of his career.',
    releaseYear: 2020, duration: 117,
    genres: ['Action','Thriller'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/extraction.jpg',
    streamUrl: 'https://test-streams.mux.dev/playlist.m3u8',
    subtitles: [{ lang: 'en', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt' }],
    createdAt: '2024-01-07T00:00:00.000Z', updatedAt: '2024-01-07T00:00:00.000Z',
    published: true, featured: false, views: 0
  },
  {
    id: 'the-old-guard',
    title: 'The Old Guard',
    description: 'A covert group of tight-knit mercenaries with a mysterious inability to die have protected the mortal world for centuries.',
    releaseYear: 2020, duration: 125,
    genres: ['Action','Fantasy'], rating: 'R',
    posterUrl: 'https://storage.googleapis.com/streamv11/posters/the-old-guard.jpg',
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    subtitles: [{ lang: 'en', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/eng.vtt' }],
    createdAt: '2024-01-08T00:00:00.000Z', updatedAt: '2024-01-08T00:00:00.000Z',
    published: true, featured: false, views: 0
  }
];

function buildSeries(slug, title, synopsis, posterUrl) {
  const seasons = [1,2].map(seasonNumber => ({
    season: seasonNumber,
    episodes: Array.from({ length: 3 }).map((_, i) => ({
      season: seasonNumber, episode: i+1,
      title: `${title} - Épisode ${seasonNumber}${i+1}`,
      synopsis: `${title} saison ${seasonNumber} épisode ${i+1}.`,
      duration: 50,
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      subtitles: [{ lang: 'fr', url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/subtitles/fra.vtt' }],
      releaseDate: new Date(2024, seasonNumber-1, i+1).toISOString()
    }))
  }));
  return {
    slug, title, synopsis, posterUrl,
    genres: ['Thriller','Drama'],
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    published: true, featured: true, views: 0, seasons
  };
}

const seriesList = [
  buildSeries('money-heist','Money Heist','The Professor leads the greatest heist ever conceived.','https://storage.googleapis.com/streamv11/posters/money-heist.jpg'),
  buildSeries('dark','Dark','A missing child sets four families on a frantic hunt for answers.','https://storage.googleapis.com/streamv11/posters/dark.jpg')
];

const categories = [
  { id:'tendances',  name:'Tendances',  order:0, createdAt:'2024-01-01T00:00:00.000Z', updatedAt:'2024-01-01T00:00:00.000Z' },
  { id:'nouveautes', name:'Nouveautés', order:1, createdAt:'2024-01-01T00:00:00.000Z', updatedAt:'2024-01-01T00:00:00.000Z' },
  { id:'originaux',  name:'Originaux',  order:2, createdAt:'2024-01-01T00:00:00.000Z', updatedAt:'2024-01-01T00:00:00.000Z' },
];

// --- FS helpers ----------------------------------------------
async function ensureDirs() {
  await fsp.mkdir(USERS_DIR, { recursive: true });
  await fsp.mkdir(HISTORY_DIR, { recursive: true });
  await fsp.mkdir(CATALOG_DIR, { recursive: true });
  await fsp.mkdir(SERIES_DIR, { recursive: true });
}

async function writeJSONAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
  const release = await lockfile.lock(dir, { retries: { retries: 5, minTimeout: 50 } });
  try {
    const tmp = `${filePath}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(value, null, 2));
    await fsp.rename(tmp, filePath);
  } finally {
    await release();
  }
}

async function writeIfMissing(filePath, value) {
  if (!FORCE && fs.existsSync(filePath)) return false;
  await writeJSONAtomic(filePath, value);
  return true;
}

// --- Seeds ----------------------------------------------------
async function seedUsers() {
  await writeIfMissing(path.join(USERS_DIR, 'admin.json'), {
    username: 'admin',
    passwordHash: ADMIN_HASH,
    role: 'admin',
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  });

  await writeIfMissing(path.join(USERS_DIR, 'users.json'), {
    users: [{
      username: 'demo',
      passwordHash: USER_HASH,
      role: 'user',
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }]
  });
}

async function seedCatalog() {
  await writeIfMissing(path.join(CATALOG_DIR, 'movies.json'), { movies });
  await writeIfMissing(path.join(CATALOG_DIR, 'categories.json'), { categories });
  for (const s of seriesList) {
    await writeIfMissing(path.join(SERIES_DIR, `${s.slug}.json`), s);
  }
}

// --- Main -----------------------------------------------------
(async function main() {
  console.log(`[seed] DATA_DIR=${DATA_DIR}  FORCE=${FORCE}`);
  await ensureDirs();
  await seedUsers();
  await seedCatalog();
  console.log('[seed] OK');
})().catch(err => {
  console.error('[seed] FAIL', err);
  process.exit(1);
});
