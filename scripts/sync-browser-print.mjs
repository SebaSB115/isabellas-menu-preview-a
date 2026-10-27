import { copyFile, mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const repo = resolve(import.meta.dirname, '..');
const source = resolve(repo, 'preview-a/shared-print');
await mkdir(resolve(source, 'vendor'), {recursive:true});
for (const [from, to] of [['build/pdfmake.min.js','pdfmake.min.js'],['build/vfs_fonts.js','vfs_fonts.js'],['build/standard-fonts/Times.js','Times.js'],['LICENSE','LICENSE-pdfmake.txt']]) {
  await copyFile(resolve(repo, 'node_modules/pdfmake', from), resolve(source, 'vendor', to));
}
const files = ['engine.js', 'vendor/pdfmake.min.js', 'vendor/vfs_fonts.js', 'vendor/Times.js', 'vendor/LICENSE-pdfmake.txt', 'vendor/NotoSans-Regular.ttf', 'vendor/NotoSans-SemiBold.ttf', 'vendor/LICENSE-NotoSans.txt'];
const hashes = Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await readFile(resolve(source, file))).digest('hex')])));
await writeFile(resolve(source, 'manifest.json'), JSON.stringify({source:'isabellas-menu-preview-a/preview-a/shared-print', pdfmake:'0.3.11', files:hashes}, null, 2) + '\n');
if (process.argv.includes('--boccantina')) {
  await cp(source, resolve(repo, '../boccantina-preview/preview-src/v2/shared-print'), {recursive:true});
}
console.log('Motor PDF gratuito versionado; distribución con hashes actualizada.');
