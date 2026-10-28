import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localFile = resolve(repo, 'data/local-preview.json');

function localDataDir() {
  let settings;
  try { settings = JSON.parse(readFileSync(localFile, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) {
    if (error.code === 'ENOENT') return resolve(repo, 'data');
    throw new Error('Revisa data/local-preview.json: no se pudo leer la configuración local.', { cause:error });
  }
  if (typeof settings?.dataDir !== 'string' || !settings.dataDir.trim()) {
    throw new Error('data/local-preview.json debe indicar una carpeta dataDir válida.');
  }
  return resolve(repo, settings.dataDir);
}

// Explicit environments (including isolated checks) always take precedence.
export const dataDir = process.env.ISABELLA_DATA_DIR ? resolve(process.env.ISABELLA_DATA_DIR) : localDataDir();
