import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(repo, '..');
const source = resolve(repo, 'preview-a/admin-entry.css');
try { await stat(resolve(workspace, 'boccantina-preview/package.json')); }
catch { throw new Error('Falta el repositorio hermano boccantina-preview; no se crearán copias parciales.'); }
const targets = [
  resolve(repo, 'docs/admin-entry.css'),
  resolve(workspace, 'boccantina-preview/snapshot/boccantina.com/preview/admin-entry.css'),
];
const check = process.argv.includes('--check');
const content = await readFile(source);

for (const target of targets) {
  if (check) {
    let copy;
    try { copy = await readFile(target); }
    catch { throw new Error(`Falta la copia de ${target}. Ejecuta npm run sync:admin-ui.`); }
    if (!content.equals(copy)) throw new Error(`Estilos compartidos desactualizados: ${target}. Ejecuta npm run sync:admin-ui.`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
console.log(check ? 'Estilos administrativos sincronizados.' : 'Estilos administrativos copiados a las dos vistas de destino.');
