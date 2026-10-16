import { categories as seed } from '../menu-data.js';

const storageKey = 'isabella-preview-a-admin-demo-v1';
const languages = ['en', 'de', 'ar', 'he'];

function freshCatalog() {
  return { version: 1, categories: structuredClone(seed) };
}

function readCatalog() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isInteger(saved.version) && Array.isArray(saved.categories)) return saved;
  } catch { /* El navegador puede tener almacenamiento deshabilitado. */ }
  return freshCatalog();
}

function keepOnlyCurrentTranslations(next, previous) {
  const previousGroups = new Map(previous.categories.map(group => [group.id, group]));
  const previousProducts = new Map(previous.categories.flatMap(group => group.items.map(item => [item.id, item])));
  const preserve = (text, oldText) => {
    if (!text || typeof text !== 'object') return;
    for (const code of languages) text[code] = text.es === oldText?.es ? oldText?.[code] || '' : '';
  };
  for (const group of next.categories) {
    preserve(group.title, previousGroups.get(group.id)?.title);
    for (const item of group.items) {
      const old = previousProducts.get(item.id);
      preserve(item.name, old?.name);
      preserve(item.description, old?.description);
      item.options?.forEach((option, index) => preserve(option.label, old?.options?.[index]?.label));
      if (item.addon) preserve(item.addon.label, old?.addon?.label);
    }
  }
}

async function prepareImage(bytes, type) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Usa una imagen JPG, PNG o WebP.');
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 10 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 10 MB.');
  const bitmap = await createImageBitmap(new Blob([bytes], { type }));
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL('image/webp', 0.74);
    if (src.length > 1_500_000) throw new Error('La imagen sigue siendo demasiado grande para esta demo; prueba otra.');
    return { src, srcSmall: src, x: 50, y: 50 };
  } finally {
    bitmap.close();
  }
}

export async function api(path, options = {}) {
  if (path === '/api/admin/menu' && (!options.method || options.method === 'GET')) return readCatalog();
  if (path === '/api/admin/menu' && options.method === 'PUT') {
    const previous = readCatalog();
    const incoming = JSON.parse(options.body);
    if (incoming.version !== previous.version) throw new Error('La demo cambió en otra pestaña. Recarga la página.');
    if (!Array.isArray(incoming.categories)) throw new Error('La lista de categorías no es válida.');
    const next = { version: previous.version + 1, categories: incoming.categories };
    keepOnlyCurrentTranslations(next, previous);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { throw new Error('El navegador no pudo guardar la demo. Libera espacio o usa otro navegador.'); }
    return next;
  }
  if (path === '/api/admin/upload' && options.method === 'POST') {
    const art = await prepareImage(options.body, options.headers?.['content-type']);
    return { art };
  }
  throw new Error('Esta operación solo está disponible en la central privada.');
}

export function resetDemo() {
  localStorage.removeItem(storageKey);
}
