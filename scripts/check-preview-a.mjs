import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, locales, rtlLocales } from '../preview-a/menu-data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'preview-a');
const expectedImages = [
  'NEW-MENU-COVER-ISA-2026-A.webp', '1-PRE.webp', '2-PRE.webp',
  '7-PRE.webp', 'ALL-4-D.webp', '4-PRE.webp', 'ALL-4-C.webp',
  'ALL-4-A.webp', 'ALL-4-B.webp',
];
const actualImages = await readdir(resolve(root, 'assets/menu-2026'));
assert.deepEqual(actualImages.sort(), [...expectedImages].sort(), 'Deben estar solo las nueve páginas de MENU 2026');
for (const file of expectedImages) {
  assert((await stat(resolve(root, 'assets/menu-2026', file))).size > 0, `Imagen vacía: ${file}`);
}
const expectedArt = expectedImages.slice(1).map(file => file.replace(/\.webp$/, '-art.webp'));
const actualArt = await readdir(resolve(root, 'assets/menu-art'));
assert.deepEqual(actualArt.sort(), expectedArt.sort(), 'Deben estar las ocho ilustraciones sin texto');
for (const file of expectedArt) {
  assert((await stat(resolve(root, 'assets/menu-art', file))).size > 0, `Ilustración vacía: ${file}`);
}
assert.deepEqual(locales, ['es', 'en', 'de', 'ar', 'he']);
assert.deepEqual([...rtlLocales], ['ar', 'he']);
const categoryIds = new Set();
const itemIds = new Set();
const unlisted = [];
const localized = (value, label) => {
  for (const locale of locales) assert(typeof value?.[locale] === 'string' && value[locale].trim(), `${label}: falta ${locale}`);
};
for (const category of categories) {
  assert(!categoryIds.has(category.id), `Categoría duplicada: ${category.id}`);
  categoryIds.add(category.id);
  assert(expectedImages.includes(category.source), `Fuente desconocida: ${category.source}`);
  localized(category.title, category.id);
  for (const item of category.items) {
    assert(!itemIds.has(item.id), `Plato duplicado: ${item.id}`);
    itemIds.add(item.id);
    assert(expectedImages.includes(item.source ?? category.source), `Fuente desconocida: ${item.id}`);
    localized(item.name, `${item.id}.name`);
    localized(item.description, `${item.id}.description`);
    if (item.price === null && !item.options) unlisted.push(item.id);
    else if (item.price !== null) assert(Number.isInteger(item.price) && item.price > 0, `Precio inválido: ${item.id}`);
    if (item.addon) {
      assert(Number.isInteger(item.addon.price) && item.addon.price > 0, `Adicional inválido: ${item.id}`);
      localized(item.addon.label, `${item.id}.addon`);
    }
    for (const option of item.options ?? []) {
      assert(Number.isInteger(option.price) && option.price > 0, `Variante inválida: ${item.id}`);
      localized(option.label, `${item.id}.option`);
    }
  }
}
assert.equal(categories.length, 8);
assert.equal(itemIds.size, 55);
assert.deepEqual(unlisted.sort(), ['salmon-ravioli', 'beef-casserole', 'espresso-martini', 'carajillo', 'baileys-cappuccino'].sort());
console.log(`Preview A: ${expectedImages.length} páginas, ${expectedArt.length} ilustraciones, ${categories.length} categorías, ${itemIds.size} platos, ${locales.length} idiomas; ${unlisted.length} precios pendientes.`);
