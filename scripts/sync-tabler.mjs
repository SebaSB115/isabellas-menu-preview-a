import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('node_modules/@tabler/core/package.json', root)));
for (const folder of ['preview-a', 'docs']) {
  const dest = new URL(`${folder}/vendor/tabler/`, root);
  await mkdir(dest, { recursive:true });
  await copyFile(new URL('node_modules/@tabler/core/dist/css/tabler.min.css', root), new URL('tabler.min.css', dest));
  await copyFile(new URL('scripts/vendor-licenses/tabler.LICENSE', root), new URL('LICENSE', dest));
  await writeFile(new URL('version.json', dest), JSON.stringify({ package:'@tabler/core', version:pkg.version, license:'MIT', source:'https://github.com/tabler/tabler', generatedBy:'scripts/sync-tabler.mjs' }, null, 2)+'\n');
}
console.log(`Tabler ${pkg.version}, MIT, sincronizado desde la dependencia fijada.`);
