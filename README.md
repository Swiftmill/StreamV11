# StreamV11

Plateforme de streaming full-stack combinant un backend Express sécurisé et un frontend Next.js (App Router) inspiré de Netflix.

## Prérequis

- Node.js 18+
- npm
- Outil `zip` disponible dans le PATH (pour les sauvegardes)

## Installation

```bash
npm install
```

## Lancer le projet en développement

```bash
npm run dev
```

Le serveur Express et Next.js sont lancés simultanément sur le port `3000`.

## Compilation & production

```bash
npm run build
npm start
```

## Seed des données

```bash
npm run seed
```

Créé :
- un administrateur `admin` (mot de passe `password`)
- un utilisateur `demo` (mot de passe `password`)
- 8 films
- 2 séries (2 saisons × 3 épisodes)
- 3 catégories

## Sauvegarde des données

```bash
npm run backup
```

Archive le dossier `data` vers `backups/backup-YYYYMMDD-HHMM.zip`.

## Validation du catalogue

```bash
npm run lint:catalog
```

Valide tous les JSON du catalogue avec Zod.

## Structure des dossiers principaux

- `server.js` : API Express + auth + Next integration
- `app/` : frontend Next.js (App Router)
- `components/` : composants réutilisables (Header, Player, Admin…)
- `lib/` : hooks et appels API (client + server)
- `scripts/` : scripts utilitaires (seed, backup, lint)
- `data/` : stockage JSON (utilisateurs, catalogue, historiques)

## Docker

Consultez `docker-compose.yml` pour lancer l’application containerisée avec volume persistant `./data:/app/data` et exposition du port `3000`.

## Sécurité & bonnes pratiques

- Sessions signées via cookies HTTP-only (expiration 7 jours)
- Tokens CSRF pour toutes les requêtes sensibles
- Verrouillage de fichiers via `proper-lockfile`
- Logs d’audit dans `data/audit.log`
- Zod sur tous les payloads
- Player HLS.js avec nettoyage strict entre épisodes
