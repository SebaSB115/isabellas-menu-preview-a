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
  .replace('Entrar a Isabella’s', 'Ver Isabella’s')
  .replace('Entrar a Boccantina', 'Ver Boccantina')
  .replace('aria-label="Entrar a la administración de Isabella’s"', 'aria-label="Ver la demostración de Isabella’s"')
  .replace('aria-label="Entrar a la administración de Boccantina"', 'aria-label="Ver la demostración de Boccantina"')
  .replace('Entorno de demostración local. Los espacios de ambos restaurantes son independientes y no están conectados a producción.', 'Demostración pública. Cada restaurante conserva sus datos de prueba en este navegador; ninguno está conectado a producción.');
await writeFile(index, html);

const isabella = resolve(target, 'isabella', 'index.html');
let isabellaHtml = await readFile(isabella, 'utf8');
isabellaHtml = isabellaHtml.replace('La versión pública es una demo aislada; sus ediciones no actualizan la carta pública ni la web oficial.', 'En la demo pública, las ediciones se reflejan en Journal dentro de este navegador; no se comparten con otros dispositivos ni modifican la web oficial.');
await writeFile(isabella, isabellaHtml);

const boccantina = resolve(target, 'boccantina', 'index.html');
let boccantinaHtml = await readFile(boccantina, 'utf8');
boccantinaHtml = boccantinaHtml.replace('https://sebasb115.github.io/boccantina-preview/?admin=extras', 'https://sebasb115.github.io/boccantina-preview/admin/extras/')
  .replace("Boccantina todavía tiene un editor de extras, no un editor general de productos como Isabella's. Los enlaces abren la demo pública de Boccantina y no modifican su web oficial.", 'Las herramientas de Boccantina se muestran en su propia demo. Los datos de prueba quedan en el navegador y no modifican la web oficial.');
await writeFile(boccantina, boccantinaHtml);
const previous = resolve(target, 'anterior.html');
let previousHtml = await readFile(previous, 'utf8');
previousHtml = previousHtml.replace('Acceso privado · preview local', 'Vista de demostración')
  .replace('<span class="portal-environment__short">Local</span>', '<span class="portal-environment__short">Demo</span>')
  .replace('Elige un restaurante. Para entrar a su administración necesitarás el usuario y la contraseña de esa tienda.', 'Selecciona un restaurante para ver las herramientas administrativas que ya están disponibles en su demo.')
  .replace('<strong>Accesos independientes</strong><span>Cada restaurante tiene su propia cuenta y sus herramientas.</span>', '<strong>Espacios separados</strong><span>Cada restaurante conserva sus propias herramientas de demostración.</span>')
  .replace('<strong>Entorno de prueba</strong><p>Esta central reúne las administraciones de Isabella\'s y Boccantina en un preview local. Ninguna está conectada a producción.</p>', '<strong>Estado del preview</strong><p>Esta entrada reúne las administraciones existentes. Todavía no comparte usuarios ni datos entre restaurantes y no está conectada a producción.</p>');
await writeFile(previous, previousHtml);
const proposal = resolve(target, 'propuesta-1.html');
let proposalHtml = await readFile(proposal, 'utf8');
proposalHtml = proposalHtml
  .replace('Vista de diseño', 'Vista de demostración')
  .replace('Entrar a Isabella’s', 'Ver Isabella’s')
  .replace('Entrar a Boccantina', 'Ver Boccantina');
await writeFile(proposal, proposalHtml);
console.log('Selector de restaurantes generado en docs/central/.');
