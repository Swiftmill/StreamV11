#!/usr/bin/env node

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'backups');

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error('Data directory does not exist. Run seed first.');
  }
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatDate() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes())
  );
}

function main() {
  ensureData();
  ensureBackupDir();
  const filename = `backup-${formatDate()}.zip`;
  const target = path.join(BACKUP_DIR, filename);
  const result = spawnSync('zip', ['-r', target, 'data'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error('Zip command failed');
  }
  console.log(`Backup created: ${target}`);
}

main();
