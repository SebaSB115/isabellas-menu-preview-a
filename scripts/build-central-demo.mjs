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
  .replace('aria-label="Entrar a la administración de Boccantina"', 'aria-label="Ver la demostración de Boccantina"');
await writeFile(index, html);
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
