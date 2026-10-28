import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'preview-a/central');
const target = resolve(repo, 'docs/central');

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });
const index = resolve(target, 'index.html');
let html = await readFile(index, 'utf8');
html = html.replace('Vista de diseño', 'Vista de demostración')
  .replace(/\s*<a class="access-link" href="\.\/usuarios\/">Gestionar accesos<\/a>/, '')
  .replace('href="./isabella/"', 'href="../admin/"')
  .replace('href="./boccantina/"', 'href="https://sebasb115.github.io/boccantina-preview/admin/login/"')
  .replace('aria-label="Entrar a la administración de Isabella’s"', 'aria-label="Abrir el acceso de demostración de Isabella’s"')
  .replace('aria-label="Entrar a la administración de Boccantina"', 'aria-label="Abrir el acceso de demostración de Boccantina"')
  .replace('Entorno de demostración local. Los espacios de ambos restaurantes son independientes y no están conectados a producción.', 'Demostración pública. Cada restaurante conserva sus datos de prueba en este navegador; ninguno está conectado a producción.');
await writeFile(index, html);

const isabella = resolve(target, 'isabella', 'index.html');
const redirectPage = (destination, restaurant) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=${destination}"><title>Acceso de demostración · ${restaurant}</title></head><body><main><p>Abriendo el acceso de demostración de ${restaurant}…</p><a href="${destination}">Ir al acceso de demostración</a></main></body></html>
`;
await writeFile(isabella, redirectPage('../../admin/', 'Isabella’s'));

const boccantina = resolve(target, 'boccantina', 'index.html');
await writeFile(boccantina, redirectPage('https://sebasb115.github.io/boccantina-preview/admin/login/', 'Boccantina'));
const previous = resolve(target, 'anterior.html');
await writeFile(previous, redirectPage('./', 'restaurantes'));
const proposal = resolve(target, 'propuesta-1.html');
await writeFile(proposal, redirectPage('./', 'restaurantes'));
console.log('Selector de restaurantes generado en docs/central/.');
