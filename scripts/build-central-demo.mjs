import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'preview-a/central');
const target = resolve(repo, 'docs/central');

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });
console.log('Selector de restaurantes generado en docs/central/.');
