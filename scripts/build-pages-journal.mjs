import { cp, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'preview-a');
const target = resolve(repo, 'docs');

await cp(resolve(source, 'design-lab'), resolve(target, 'design-lab'), { recursive: true, force: true });
await Promise.all([
  copyFile(resolve(source, 'index.html'), resolve(target, 'index.html')),
  copyFile(resolve(source, 'entry.js'), resolve(target, 'entry.js')),
  copyFile(resolve(source, 'borrador-1.html'), resolve(target, 'borrador-1.html')),
]);

const appPath = resolve(target, 'design-lab/app.js');
let app = (await readFile(appPath, 'utf8')).replace(/\r\n/g, '\n');
const imports = "import { createJournalPaginator } from './journal-pages.js';";
if (!app.includes(imports)) throw new Error('No se encontró el módulo de paginación de Journal.');
app = app.replace(imports, `${imports}\nimport { api as demoApi } from '../admin/demo-store.js';`);
const localRequest = "    const response = await fetch('../api/menu', { cache:'no-store' });\n    if (!response.ok) return;\n    const data = await response.json();";
if (!app.includes(localRequest)) throw new Error('No se encontró la lectura del catálogo local.');
app = app.replace(localRequest, "    const data = await demoApi('/api/admin/menu');");
await writeFile(appPath, app);

// The isolated continuous-reader proposal uses the same browser-local catalog
// as the static administrative demo; the live preview keeps the Node API.
const flowPath = resolve(target, 'design-lab/journal-fluido.js');
let flow = await readFile(flowPath, 'utf8');
const flowRequest = "  const response=await fetch('../api/menu',{cache:'no-store'});\n  if(!response.ok)throw new Error('No se pudo leer la carta.');\n  return response.json();";
if (!flow.includes(flowRequest)) throw new Error('No se encontró la lectura del catálogo del lector continuo.');
flow = flow.replace(flowRequest, "  return demoApi('/api/admin/menu');");
flow = "import { api as demoApi } from '../admin/demo-store.js';\n" + flow;
await writeFile(flowPath, flow);

for (const [name, label] of [['journal.html', 'Vista previa local'], ['il-libro.html', 'Exploración visual local'], ['journal-fluido.html', 'Propuesta local']]) {
  const path = resolve(target, 'design-lab', name);
  const html = await readFile(path, 'utf8');
  if (!html.includes(label)) throw new Error(`Falta el aviso de preview en ${name}.`);
  await writeFile(path, html.replace(label, 'Demo pública · no producción'));
}

console.log('Isabella’s Journal y Borrador 1 generados en docs/ para la demo pública.');
