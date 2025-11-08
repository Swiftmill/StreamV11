// scripts/seed-if-empty.js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const usersAdmin = path.join(DATA_DIR, 'users', 'admin.json');

try {
  if (!fs.existsSync(usersAdmin)) {
    console.log('🔸 DATA_DIR vide -> seed…');
    const r = spawnSync('node', ['scripts/seed.js'], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log('✅ seed terminé');
  } else {
    console.log('🔹 DATA_DIR déjà initialisé, pas de seed');
  }
} catch (e) {
  console.error('Seed check error:', e);
}
