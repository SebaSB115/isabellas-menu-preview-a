import { mkdir, readFile, rename, writeFile, copyFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { categories as seed, locales } from '../preview-a/menu-data.js';
import { translateSpanish } from './translate-menu.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const dataDir = process.env.ISABELLA_DATA_DIR ? resolve(process.env.ISABELLA_DATA_DIR) : resolve(root, 'data');
export const dataFile = resolve(dataDir, 'menu.json');
const originals = new Set(['1-PRE.webp', '2-PRE.webp', '7-PRE.webp', 'ALL-4-D.webp', '4-PRE.webp', 'ALL-4-C.webp', 'ALL-4-A.webp', 'ALL-4-B.webp']);
const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const uploadPattern = /^\.\/assets\/uploads\/[a-f0-9-]+-(?:800|1600)\.webp$/;
const text = (value, max) => typeof value === 'string' && value.trim().length <= max ? value.trim() : null;
const price = value => value === null || (Number.isInteger(value) && value >= 0 && value <= 10000000);

export async function readCatalog() {
  try { return JSON.parse(await readFile(dataFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initial = { version: 1, updatedAt: new Date().toISOString(), categories: structuredClone(seed) };
    await mkdir(dirname(dataFile), { recursive: true });
    try { await writeFile(dataFile, `${JSON.stringify(initial, null, 2)}\n`, { flag: 'wx' }); }
    catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; return JSON.parse(await readFile(dataFile, 'utf8')); }
    return initial;
  }
}

function localized(value, required = false, max = 250) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return locales.every(locale => {
    const candidate = text(value[locale], max);
    return candidate !== null && (!required || locale !== 'es' || candidate.length > 0);
  });
}

export function validateCatalog(input) {
  if (!input || !Array.isArray(input.categories) || input.categories.length > 50) return 'La lista de categorías no es válida.';
  const categoryIds = new Set();
  const itemIds = new Set();
  for (const category of input.categories) {
    if (!idPattern.test(category?.id ?? '') || categoryIds.has(category.id)) return 'Hay una categoría con identificador inválido o repetido.';
    categoryIds.add(category.id);
    if (!localized(category.title, true, 100)) return `Revisa el nombre y los idiomas de ${category.id}.`;
    if (!originals.has(category.source)) return `La página de origen de ${category.id} no es válida.`;
    if (category.visible !== undefined && typeof category.visible !== 'boolean') return `La visibilidad de ${category.id} no es válida.`;
    if (category.art !== undefined && category.art !== null) {
      const art = category.art;
      if (!uploadPattern.test(art?.src ?? '') || !uploadPattern.test(art?.srcSmall ?? '') ||
        !Number.isFinite(art.x) || art.x < 0 || art.x > 100 || !Number.isFinite(art.y) || art.y < 0 || art.y > 100) return `El fondo de ${category.id} no es válido.`;
    }
    if (!Array.isArray(category.items) || category.items.length > 300) return `Los productos de ${category.id} no son válidos.`;
    for (const item of category.items) {
      if (!idPattern.test(item?.id ?? '') || itemIds.has(item.id)) return 'Hay un producto con identificador inválido o repetido.';
      itemIds.add(item.id);
      if (!localized(item.name, true, 150) || !localized(item.description, true, 1000)) return `Revisa nombre, descripción e idiomas de ${item.id}.`;
      if (!price(item.price)) return `El precio de ${item.id} no es válido.`;
      if (item.visible !== undefined && typeof item.visible !== 'boolean') return `La visibilidad de ${item.id} no es válida.`;
      if (item.source !== undefined && !originals.has(item.source)) return `La página de origen de ${item.id} no es válida.`;
      if (item.addon !== undefined) {
        if (!item.addon || !price(item.addon.price) || item.addon.price === null || !localized(item.addon.label, true, 100)) return `El adicional de ${item.id} no es válido.`;
      }
      if (item.options !== undefined && (!Array.isArray(item.options) || item.options.length > 20 || item.options.some(option => !price(option?.price) || option.price === null || !localized(option.label, true, 100)))) return `Las variantes de ${item.id} no son válidas.`;
    }
  }
  return null;
}

let writeQueue = Promise.resolve();
async function applyAutomaticTranslations(categories, previousCategories) {
  const previousGroups = new Map(previousCategories.map(category => [category.id, category]));
  const previousItems = new Map(previousCategories.flatMap(category => category.items.map(item => [item.id, item])));
  const pending = [];
  const add = (map, oldMap) => {
    if (oldMap?.es === map.es && locales.slice(1).every(code => oldMap?.[code])) {
      for (const code of locales.slice(1)) map[code] = oldMap[code];
    } else if (map.es) pending.push(map);
    else for (const code of locales.slice(1)) map[code] = '';
  };
  for (const category of categories) {
    add(category.title, previousGroups.get(category.id)?.title);
    for (const item of category.items) {
      const old = previousItems.get(item.id);
      add(item.name, old?.name);
      add(item.description, old?.description);
      for (const [index, option] of (item.options || []).entries()) add(option.label, old?.options?.[index]?.label);
      if (item.addon) add(item.addon.label, old?.addon?.label);
    }
  }
  const unique = [...new Set(pending.map(map => map.es))];
  const translated = await translateSpanish(unique);
  const bySource = new Map(unique.map((source, index) => [source, translated[index]]));
  for (const map of pending) Object.assign(map, bySource.get(map.es));
}
async function saveCatalogNow(next, expectedVersion) {
  const current = await readCatalog();
  if (current.version !== expectedVersion) return { conflict: true, current };
  const error = validateCatalog(next);
  if (error) return { error };
  const categories = structuredClone(next.categories);
  await applyAutomaticTranslations(categories, current.categories);
  const translatedError = validateCatalog({ categories });
  if (translatedError) return { error:translatedError };
  for (const category of categories) {
    if (!category.art) continue;
    for (const path of [category.art.src, category.art.srcSmall]) {
      try { if (!(await stat(resolve(root, 'preview-a', path.slice(2)))).isFile()) return { error:`Falta el archivo de fondo de ${category.id}.` }; }
      catch { return { error:`Falta el archivo de fondo de ${category.id}.` }; }
    }
  }
  const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), categories };
  const temp = `${dataFile}.${randomUUID()}.tmp`;
  await copyFile(dataFile, `${dataFile}.bak`);
  await writeFile(temp, `${JSON.stringify(saved, null, 2)}\n`);
  await rename(temp, dataFile);
  return { saved };
}

export function saveCatalog(next, expectedVersion) {
  const result = writeQueue.then(() => saveCatalogNow(next, expectedVersion));
  writeQueue = result.catch(() => {});
  return result;
}
