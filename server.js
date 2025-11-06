'use strict';

// @ts-check

const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const lockfile = require('proper-lockfile');
const rateLimit = require('express-rate-limit');
const next = require('next');
const { z } = require('zod');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'streamv11-cookie-secret';
const SESSION_COOKIE = 'stream_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CSRF_HEADER = 'x-csrf-token';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const HISTORY_DIR = path.join(USERS_DIR, 'history');
const CATALOG_DIR = path.join(DATA_DIR, 'catalog');
const MOVIES_FILE = path.join(CATALOG_DIR, 'movies.json');
const SERIES_DIR = path.join(CATALOG_DIR, 'series');
const CATEGORIES_FILE = path.join(CATALOG_DIR, 'categories.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');
const VIDEO_DOMAIN_WHITELIST = new Set([
  'example.com',
  'cdn.example.com',
  'd1f7jvrzd4fora.cloudfront.net',
  'bitmovin-a.akamaihd.net',
  'test-streams.mux.dev',
  'storage.googleapis.com',
  'commondatastorage.googleapis.com',
  'stream.mux.com'
]);

const Role = {
  ADMIN: 'admin',
  USER: 'user'
};

const app = express();
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", 'data:', 'https:'],
      "media-src": ["'self'", 'https:'],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", 'https:'],
      "frame-ancestors": ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'http://localhost:3000') {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser(COOKIE_SECRET));

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @typedef {{
 *  username: string,
 *  passwordHash: string,
 *  role: 'admin'|'user',
 *  active: boolean,
 *  createdAt: string,
 *  updatedAt: string
 * }} StoredUser
 */

/**
 * @typedef {{
 *  id: string,
 *  title: string,
 *  description: string,
 *  releaseYear: number,
 *  duration: number,
 *  genres: string[],
 *  rating: string,
 *  posterUrl: string,
 *  streamUrl: string,
 *  subtitles: { lang: string, url: string }[],
 *  createdAt: string,
 *  updatedAt: string,
 *  published: boolean,
 *  featured: boolean,
 *  views: number
 * }} Movie
 */

/**
 * @typedef {{
 *  season: number,
 *  episode: number,
 *  title: string,
 *  synopsis: string,
 *  duration: number,
 *  streamUrl: string,
 *  subtitles: { lang: string, url: string }[],
 *  releaseDate: string
 * }} Episode
 */

/**
 * @typedef {{
 *  slug: string,
 *  title: string,
 *  synopsis: string,
 *  genres: string[],
 *  posterUrl: string,
 *  createdAt: string,
 *  updatedAt: string,
 *  published: boolean,
 *  featured: boolean,
 *  views: number,
 *  seasons: {
 *    season: number,
 *    episodes: Episode[]
 *  }[]
 * }} Series
 */

/**
 * @typedef {{
 *  id: string,
 *  name: string,
 *  order: number,
 *  createdAt: string,
 *  updatedAt: string
 * }} Category
 */

/**
 * @typedef {{
 *  id: string,
 *  username: string,
 *  role: 'admin'|'user',
 *  csrfToken: string,
 *  expiresAt: number
 * }} SessionRecord
 */

const userSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
  role: z.enum([Role.ADMIN, Role.USER])
});

const userUpdateSchema = z.object({
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
  role: z.enum([Role.ADMIN, Role.USER]).optional()
});

const subtitleSchema = z.object({
  lang: z.string().min(2).max(8),
  url: z.string().url()
});

const movieSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  releaseYear: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  duration: z.number().int().positive(),
  genres: z.array(z.string().min(1)).min(1),
  rating: z.string().min(1),
  posterUrl: z.string().url(),
  streamUrl: z.string().url().refine(url => VIDEO_DOMAIN_WHITELIST.has(new URL(url).hostname), {
    message: 'Stream URL domain is not allowed'
  }),
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
  streamUrl: z.string().url().refine(url => VIDEO_DOMAIN_WHITELIST.has(new URL(url).hostname), {
    message: 'Stream URL domain is not allowed'
  }),
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
  seasons: z.array(z.object({
    season: z.number().int().min(1),
    episodes: z.array(episodeSchema)
  }))
});

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const historyEntrySchema = z.object({
  contentId: z.string().min(1),
  type: z.enum(['movie', 'series']),
  progress: z.number().min(0).max(1),
  lastWatched: z.string().datetime(),
  season: z.number().int().min(1).optional(),
  episode: z.number().int().min(1).optional()
});

const auditEventSchema = z.object({
  timestamp: z.string().datetime(),
  user: z.string().min(1),
  action: z.string().min(1),
  target: z.string().min(1),
  details: z.string().min(1)
});

const playSchema = z.object({
  contentId: z.string().min(1),
  type: z.enum(['movie', 'series'])
});

/** @type {Map<string, SessionRecord>} */
const sessions = new Map();

async function ensureDirectories() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(USERS_DIR, { recursive: true });
  await fsp.mkdir(HISTORY_DIR, { recursive: true });
  await fsp.mkdir(CATALOG_DIR, { recursive: true });
  await fsp.mkdir(SERIES_DIR, { recursive: true });
}

async function readJSON(filePath, defaultValue) {
  try {
    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

async function writeFileLocked(filePath, content) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
  const release = await lockfile.lock(dir, { retries: { retries: 5, minTimeout: 50 } });
  try {
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmpPath, content, 'utf-8');
    await fsp.rename(tmpPath, filePath);
  } finally {
    await release();
  }
}

async function writeJSON(filePath, data) {
  await writeFileLocked(filePath, JSON.stringify(data, null, 2));
}

async function appendAudit(user, action, target, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    user,
    action,
    target,
    details
  };
  const parsed = auditEventSchema.safeParse(entry);
  if (!parsed.success) {
    throw new Error('Invalid audit entry');
  }
  const line = `${entry.timestamp} | ${entry.user} | ${entry.action} | ${entry.target} | ${entry.details}\n`;
  await fsp.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await fsp.appendFile(AUDIT_FILE, line, 'utf-8');
}

async function loadSessions() {
  const data = await readJSON(SESSION_FILE, []);
  if (Array.isArray(data)) {
    for (const session of data) {
      if (session && typeof session === 'object' && typeof session.id === 'string') {
        sessions.set(session.id, session);
      }
    }
  }
}

async function persistSessions() {
  await writeJSON(SESSION_FILE, Array.from(sessions.values()));
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(id);
    }
  }
}

async function getAllUsers() {
  const admins = await readJSON(path.join(USERS_DIR, 'admin.json'), { users: [] });
  const users = await readJSON(path.join(USERS_DIR, 'users.json'), { users: [] });
  return [...admins.users, ...users.users];
}

async function findUser(username) {
  const adminsPath = path.join(USERS_DIR, 'admin.json');
  const usersPath = path.join(USERS_DIR, 'users.json');
  const admins = await readJSON(adminsPath, { users: [] });
  const users = await readJSON(usersPath, { users: [] });
  const adminUser = admins.users.find(u => u.username === username);
  if (adminUser) {
    return { user: adminUser, file: adminsPath, collection: admins.users };
  }
  const regularUser = users.users.find(u => u.username === username);
  if (regularUser) {
    return { user: regularUser, file: usersPath, collection: users.users };
  }
  return null;
}

async function saveUserRecord(filePath, users) {
  await writeJSON(filePath, { users });
}

function requireAuth(role) {
  return async (req, res, next) => {
    const sessionId = req.signedCookies[SESSION_COOKIE];
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    cleanExpiredSessions();
    const session = sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(sessionId);
      await persistSessions();
      return res.status(401).json({ error: 'Session expired' });
    }
    if (role && session.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = { username: session.username, role: session.role };
    req.session = session;
    next();
  };
}

function requireCsrf(req, res, next) {
  const token = req.headers[CSRF_HEADER];
  if (!token || typeof token !== 'string') {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  const sessionToken = req.session?.csrfToken;
  if (!sessionToken || sessionToken !== token) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

function sanitizeMoviePayload(payload) {
  const parsed = movieSchema.safeParse(payload);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

function sanitizeSeriesPayload(payload) {
  const parsed = seriesSchema.safeParse(payload);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

function sanitizeCategoryPayload(payload) {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

async function getMovies() {
  const data = await readJSON(MOVIES_FILE, { movies: [] });
  const parsed = z.object({ movies: z.array(movieSchema) }).safeParse(data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.movies;
}

async function saveMovies(movies) {
  const uniqueIds = new Set();
  for (const movie of movies) {
    if (uniqueIds.has(movie.id)) {
      throw new Error(`Duplicate movie id ${movie.id}`);
    }
    uniqueIds.add(movie.id);
  }
  await writeJSON(MOVIES_FILE, { movies });
}

async function getSeries(slug) {
  const filePath = path.join(SERIES_DIR, `${slug}.json`);
  const data = await readJSON(filePath, null);
  if (!data) {
    return null;
  }
  const parsed = seriesSchema.safeParse(data);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

async function saveSeries(series) {
  const filePath = path.join(SERIES_DIR, `${series.slug}.json`);
  await writeJSON(filePath, series);
}

async function listSeries() {
  const entries = await fsp.readdir(SERIES_DIR, { withFileTypes: true }).catch(() => []);
  const seriesList = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const slug = entry.name.replace(/\.json$/, '');
      const item = await getSeries(slug);
      if (item) {
        seriesList.push(item);
      }
    }
  }
  return seriesList;
}

async function getCategories() {
  const data = await readJSON(CATEGORIES_FILE, { categories: [] });
  const parsed = z.object({ categories: z.array(categorySchema) }).safeParse(data);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.categories;
}

async function saveCategories(categories) {
  const ids = new Set();
  for (const cat of categories) {
    if (ids.has(cat.id)) {
      throw new Error(`Duplicate category id ${cat.id}`);
    }
    ids.add(cat.id);
  }
  await writeJSON(CATEGORIES_FILE, { categories });
}

async function incrementMovieViews(movieId) {
  const movies = await getMovies();
  const index = movies.findIndex(m => m.id === movieId);
  if (index === -1) {
    return;
  }
  movies[index].views += 1;
  movies[index].updatedAt = new Date().toISOString();
  await saveMovies(movies);
}

async function incrementSeriesViews(slug) {
  const series = await getSeries(slug);
  if (!series) {
    return;
  }
  series.views += 1;
  series.updatedAt = new Date().toISOString();
  await saveSeries(series);
}

const VIEWS_COOKIE = 'stream_viewed';

function parseViewCookie(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

async function registerView(req, res, type, contentId) {
  const raw = req.signedCookies[VIEWS_COOKIE];
  const now = Date.now();
  const existing = parseViewCookie(raw).filter(entry => entry.expiresAt > now);
  const key = `${type}:${contentId}`;
  if (!existing.some(entry => entry.key === key)) {
    existing.push({ key, expiresAt: now + 24 * 60 * 60 * 1000 });
    res.cookie(VIEWS_COOKIE, JSON.stringify(existing), {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    if (type === 'movie') {
      await incrementMovieViews(contentId);
    } else {
      await incrementSeriesViews(contentId);
    }
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function sortSeriesSeasons(series) {
  series.seasons.sort((a, b) => a.season - b.season);
  for (const season of series.seasons) {
    season.episodes.sort((a, b) => a.episode - b.episode);
  }
}

function handleError(res, error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }
  return res.status(400).json({ error: error.message || 'Bad request' });
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
    const { username, password } = schema.parse(req.body);
    const record = await findUser(username);
    if (!record) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { user } = record;
    if (!user.active) {
      return res.status(403).json({ error: 'User deactivated' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    cleanExpiredSessions();
    const sessionId = crypto.randomUUID();
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const session = {
      id: sessionId,
      username: user.username,
      role: user.role,
      csrfToken,
      expiresAt
    };
    sessions.set(sessionId, session);
    await persistSessions();
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS
    });
    await appendAudit(user.username, 'login', 'auth', 'Successful login');
    res.json({ username: user.username, role: user.role, csrfToken });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/auth/logout', requireAuth(), requireCsrf, async (req, res) => {
  const sessionId = req.signedCookies[SESSION_COOKIE];
  sessions.delete(sessionId);
  await persistSessions();
  res.clearCookie(SESSION_COOKIE);
  await appendAudit(req.user.username, 'logout', 'auth', 'User logout');
  res.json({ success: true });
});

app.get('/api/auth/session', requireAuth(), async (req, res) => {
  res.json({ username: req.user.username, role: req.user.role, csrfToken: req.session.csrfToken });
});

app.get('/api/users', requireAuth(Role.ADMIN), async (req, res) => {
  const users = await getAllUsers();
  res.json(users.map(user => ({ ...user, passwordHash: undefined })));
});

app.post('/api/users', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const parsed = userSchema.parse(req.body);
    const existing = await findUser(parsed.username);
    if (existing) {
      throw new Error('User already exists');
    }
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const now = new Date().toISOString();
    /** @type {StoredUser} */
    const newUser = {
      username: parsed.username,
      passwordHash,
      role: parsed.role,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    const targetFile = parsed.role === Role.ADMIN ? path.join(USERS_DIR, 'admin.json') : path.join(USERS_DIR, 'users.json');
    const data = await readJSON(targetFile, { users: [] });
    data.users.push(newUser);
    await saveUserRecord(targetFile, data.users);
    await appendAudit(req.user.username, 'create_user', newUser.username, `Role ${newUser.role}`);
    res.status(201).json({ username: newUser.username, role: newUser.role, active: newUser.active, createdAt: newUser.createdAt });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/users/:username', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { username } = req.params;
    const updates = userUpdateSchema.parse(req.body);
    const record = await findUser(username);
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { user, file, collection } = record;
    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, 12);
    }
    if (typeof updates.active === 'boolean') {
      user.active = updates.active;
    }
    if (updates.role && updates.role !== user.role) {
      user.role = updates.role;
    }
    user.updatedAt = new Date().toISOString();
    await saveUserRecord(file, collection);
    await appendAudit(req.user.username, 'update_user', username, JSON.stringify(updates));
    res.json({ username: user.username, role: user.role, active: user.active, updatedAt: user.updatedAt });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/users/:username', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { username } = req.params;
    const record = await findUser(username);
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { file, collection } = record;
    const updated = collection.filter(u => u.username !== username);
    await saveUserRecord(file, updated);
    await appendAudit(req.user.username, 'delete_user', username, 'User removed');
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/movies', requireAuth(), async (req, res) => {
  const movies = await getMovies();
  res.json(movies);
});

app.post('/api/movies', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const movie = sanitizeMoviePayload(req.body);
    const movies = await getMovies();
    if (movies.some(m => m.id === movie.id)) {
      throw new Error('Movie already exists');
    }
    movies.push(movie);
    await saveMovies(movies);
    await appendAudit(req.user.username, 'create_movie', movie.id, movie.title);
    res.status(201).json(movie);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/movies/:id', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const movie = sanitizeMoviePayload({ ...req.body, id });
    const movies = await getMovies();
    const index = movies.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    movies[index] = movie;
    await saveMovies(movies);
    await appendAudit(req.user.username, 'update_movie', movie.id, movie.title);
    res.json(movie);
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/movies/:id', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const movies = await getMovies();
    const index = movies.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    const [removed] = movies.splice(index, 1);
    await saveMovies(movies);
    await appendAudit(req.user.username, 'delete_movie', id, removed.title);
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/series', requireAuth(), async (req, res) => {
  const seriesList = await listSeries();
  res.json(seriesList);
});

app.post('/api/series', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const parsed = seriesSchema.parse(req.body);
    const existing = await getSeries(parsed.slug);
    if (existing) {
      throw new Error('Series already exists');
    }
    sortSeriesSeasons(parsed);
    await saveSeries(parsed);
    await appendAudit(req.user.username, 'create_series', parsed.slug, parsed.title);
    res.status(201).json(parsed);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/series/:slug', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { slug } = req.params;
    const existing = await getSeries(slug);
    if (!existing) {
      return res.status(404).json({ error: 'Series not found' });
    }
    const payload = { ...req.body, slug };
    const parsed = seriesSchema.parse(payload);
    sortSeriesSeasons(parsed);
    await saveSeries(parsed);
    await appendAudit(req.user.username, 'update_series', slug, parsed.title);
    res.json(parsed);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/series/:slug/episodes', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { slug } = req.params;
    const existing = await getSeries(slug);
    const episodePayload = episodeSchema.parse(req.body);
    if (!existing) {
      const now = new Date().toISOString();
      const newSeries = {
        slug,
        title: req.body.seriesTitle || slug,
        synopsis: req.body.seriesSynopsis || 'Synopsis à venir',
        genres: req.body.seriesGenres || ['Drame'],
        posterUrl: req.body.seriesPosterUrl,
        createdAt: now,
        updatedAt: now,
        published: true,
        featured: false,
        views: 0,
        seasons: [
          { season: episodePayload.season, episodes: [episodePayload] }
        ]
      };
      sortSeriesSeasons(newSeries);
      const validated = seriesSchema.parse(newSeries);
      await saveSeries(validated);
      await appendAudit(req.user.username, 'create_series_via_episode', slug, JSON.stringify(episodePayload));
      return res.status(201).json(validated);
    }
    let season = existing.seasons.find(s => s.season === episodePayload.season);
    if (!season) {
      season = { season: episodePayload.season, episodes: [] };
      existing.seasons.push(season);
    }
    const episodeIndex = season.episodes.findIndex(ep => ep.episode === episodePayload.episode);
    if (episodeIndex === -1) {
      season.episodes.push(episodePayload);
    } else {
      season.episodes[episodeIndex] = episodePayload;
    }
    sortSeriesSeasons(existing);
    existing.updatedAt = new Date().toISOString();
    const validated = seriesSchema.parse(existing);
    await saveSeries(validated);
    await appendAudit(req.user.username, 'upsert_episode', slug, `S${episodePayload.season}E${episodePayload.episode}`);
    res.status(201).json(validated);
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/series/:slug', requireAuth(Role.ADMIN), requireCsrf, async (req, res) => {
  try {
    const { slug } = req.params;
    const filePath = path.join(SERIES_DIR, `${slug}.json`);
    await fsp.unlink(filePath);
    await appendAudit(req.user.username, 'delete_series', slug, 'Series removed');
    res.status(204).send();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Series not found' });
    }
    handleError(res, error);
  }
});

app.get('/api/categories', requireAuth(), async (req, res) => {
  const categories = await getCategories();
  res.json(categories);
});

app.post('/api/categories', requireAuth(Role.ADMIN), requireCsrf, adminLimiter, async (req, res) => {
  try {
    const category = sanitizeCategoryPayload(req.body);
    const categories = await getCategories();
    if (categories.some(cat => cat.id === category.id)) {
      throw new Error('Category already exists');
    }
    categories.push(category);
    categories.sort((a, b) => a.order - b.order);
    await saveCategories(categories);
    await appendAudit(req.user.username, 'create_category', category.id, category.name);
    res.status(201).json(category);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/categories/:id', requireAuth(Role.ADMIN), requireCsrf, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const category = sanitizeCategoryPayload({ ...req.body, id });
    const categories = await getCategories();
    const index = categories.findIndex(cat => cat.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }
    categories[index] = category;
    categories.sort((a, b) => a.order - b.order);
    await saveCategories(categories);
    await appendAudit(req.user.username, 'update_category', id, category.name);
    res.json(category);
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/categories/:id', requireAuth(Role.ADMIN), requireCsrf, adminLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const categories = await getCategories();
    const filtered = categories.filter(cat => cat.id !== id);
    if (filtered.length === categories.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    await saveCategories(filtered);
    await appendAudit(req.user.username, 'delete_category', id, 'Category removed');
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/metrics/play', requireAuth(), requireCsrf, async (req, res) => {
  try {
    const { contentId, type } = playSchema.parse(req.body);
    await registerView(req, res, type, contentId);
    await appendAudit(req.user.username, 'view_registered', `${type}:${contentId}`, 'Playback registered');
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/history', requireAuth(), async (req, res) => {
  const historyPath = path.join(HISTORY_DIR, `${req.user.username}.json`);
  const data = await readJSON(historyPath, { entries: [] });
  const parsed = z.object({ entries: z.array(historyEntrySchema) }).safeParse(data);
  if (!parsed.success) {
    return res.json([]);
  }
  res.json(parsed.data.entries);
});

app.post('/api/history', requireAuth(), requireCsrf, async (req, res) => {
  try {
    const entry = historyEntrySchema.parse(req.body);
    const historyPath = path.join(HISTORY_DIR, `${req.user.username}.json`);
    const data = await readJSON(historyPath, { entries: [] });
    const entries = data.entries || [];
    const index = entries.findIndex(item => item.contentId === entry.contentId && item.type === entry.type && item.season === entry.season && item.episode === entry.episode);
    if (index === -1) {
      entries.push(entry);
    } else {
      entries[index] = entry;
    }
    await writeJSON(historyPath, { entries });
    await appendAudit(req.user.username, 'update_history', entry.contentId, JSON.stringify(entry));
    res.status(201).json(entry);
  } catch (error) {
    handleError(res, error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

(async () => {
  await ensureDirectories();
  await loadSessions();
  await nextApp.prepare();
  app.all('*', (req, res) => handle(req, res));
  app.listen(PORT, () => {
    // server started
  });
})();

module.exports = app;
