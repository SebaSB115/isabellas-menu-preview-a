import {PRINT_DESIGN_VERSION} from './layout.js';
import {createPrintDefinition} from './definition.js';
// Fuente compartida de impresión de las demos. No sustituye la API privada.
import {normalizePrintSelection} from '../shared-print/design.js';
const assets = new URL('../shared-print/vendor/', import.meta.url);
let loading;
function loadScript(name) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(name, assets).href;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error('No se pudo cargar el motor PDF. Comprueba la conexión y vuelve a intentar.')); };
    document.head.append(script);
  });
}
async function renderer() {
  if (!loading) loading = (async () => {
    await loadScript('pdfmake.min.js');
    await loadScript('vfs_fonts.js');
    await loadScript('Times.js');
    window.pdfMake.addFonts({NotoSans:{normal:new URL('NotoSans-Regular.ttf',assets).href,bold:new URL('NotoSans-SemiBold.ttf',assets).href,italics:new URL('NotoSans-Regular.ttf',assets).href,bolditalics:new URL('NotoSans-SemiBold.ttf',assets).href}});
    return window.pdfMake;
  })().catch(error => { loading = null; throw error; });
  return loading;
}
const tx = (value, language) => typeof value === 'string' ? value : value?.[language] || value?.es || '';
const ordered = (values, key) => [...values].sort((a, b) => (a.position || 0) - (b.position || 0) || String(a[key] || '').localeCompare(String(b[key] || '')));
export function project(catalog, brand, language) {
  if (!['es', 'en'].includes(language)) throw new Error('Selecciona español o inglés.');
  const groups = brand === 'isabella'
    ? catalog.categories.filter(c => c.visible !== false).map(c => ({ id:c.id, title:tx(c.title, language), items:c.items.filter(i => i.visible !== false).map(i => ({ id:i.id, name:tx(i.name, language), description:tx(i.description, language), price:i.price, options:(i.options || []).map(o => ({ label:tx(o.label, language), price:o.price })), addon:i.addon ? { label:tx(i.addon.label, language), price:i.addon.price } : null })) }))
    : ordered(catalog.categories.filter(c => c.visible !== false), 'es').map(c => ({ id:c.id, title:language === 'en' ? c.en || c.es : c.es, items:ordered(catalog.products.filter(i => i.visible !== false && i.category === c.id), 'nameEs').map(i => ({ id:i.id, name:language === 'en' ? i.nameEn || i.nameEs : i.nameEs, description:language === 'en' ? i.descEn || i.descEs : i.descEs, price:i.price, options:[], addon:null })) }));
  return { layout:PRINT_DESIGN_VERSION, brand, language, groups:groups.filter(g => g.items.length), publicUrl:catalog.settings?.publicUrl || '' };
}
async function digest(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}
function database(brand) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${brand}-demo-print-v1`, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('editions', { keyPath:'id' });
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('El navegador no permite guardar las ediciones. Habilita el almacenamiento del sitio e inténtalo de nuevo.'));
  });
}
async function stored(brand, store, id) {
  const db = await database(brand);
  try {
    return await new Promise((resolve, reject) => {
      const request = id === undefined ? db.transaction(store).objectStore(store).getAll() : db.transaction(store).objectStore(store).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('No se pudo leer el historial de este navegador.'));
    });
  } finally { db.close(); }
}
async function save(brand, edition, blob) {
  const db = await database(brand);
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['editions', 'files'], 'readwrite');
      transaction.objectStore('editions').put(edition);
      transaction.objectStore('files').put(blob, edition.id);
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(new Error('No hay espacio para archivar el PDF. Las ediciones anteriores se conservan. Libera espacio y vuelve a intentar.'));
    });
  } finally { db.close(); }
}
function differences(before, after) {
  const rows = snapshot => new Map((snapshot?.groups || []).flatMap((g, index) => [[`c:${g.id}`, JSON.stringify([g.title, index])], ...g.items.map((i, order) => [`p:${i.id}`, JSON.stringify([g.id, order, i])])]));
  const old = rows(before), next = rows(after), changes = { added:0, changed:0, removed:0 };
  for (const [id, value] of next) { if (!old.has(id)) changes.added++; else if (old.get(id) !== value) changes.changed++; }
  for (const id of old.keys()) if (!next.has(id)) changes.removed++;
  if ((before?.publicUrl || '') !== after.publicUrl) changes.changed++;
  return changes;
}
async function logoData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudo cargar el logotipo para la edición. Vuelve a intentar.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el logotipo.'));
    reader.readAsDataURL(blob);
  });
}
export async function definition(snapshot,edition,logo){return createPrintDefinition(snapshot,edition,logo,await renderer());}
export function createPrintService({ brand, readCatalog, logo }) {
  let queue = Promise.resolve();
  const revision = catalog => catalog.version ?? catalog.revision;
  const all = async () => (await stored(brand, 'editions')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selected = (catalog, language, proposal, size, design) => ({...project(catalog, brand, language), ...normalizePrintSelection(proposal, size, design, brand)});
  async function status(language, proposal = 'actual', size = 'A4', design = null) {
    const catalog = await readCatalog(), snapshot = selected(catalog, language, proposal, size, design), fingerprint = await digest(snapshot), list = await all();
    const latest = list.find(e => e.language === language && e.proposal === proposal && e.size === size);
    return { version:revision(catalog), revision:revision(catalog), current:list.some(e => e.fingerprint === fingerprint && e.proposal === proposal && e.size === size), changes:differences(latest?.snapshot, snapshot), editions:list.map(({snapshot:_, ...e}) => ({...e, current:e.fingerprint === fingerprint && e.proposal === proposal && e.size === size, legacy:!(e.proposal === 'actual' || /^p-[0-9a-f-]{36}$/.test(e.proposal || '')) || !e.size})) };
  }
  async function documentFor(language, catalog, edition) {
    const [pdf, image] = await Promise.all([renderer(), logoData(logo)]);
    return pdf.createPdf(await createPrintDefinition(selected(catalog, language, edition.proposal, edition.size, edition.design), edition, image, pdf));
  }
  function generate(version, language, proposal = 'actual', size = 'A4', design = null) {
    const task = queue.then(async () => {
      const catalog = await readCatalog();
      if (revision(catalog) !== version) throw new Error('La carta cambió. Actualiza el estado antes de generar.');
      const snapshot = selected(catalog, language, proposal, size, design), fingerprint = await digest(snapshot), existing = (await all()).find(e => e.fingerprint === fingerprint && e.proposal === proposal && e.size === size);
      if (existing) return existing;
      const edition = {id:fingerprint, fingerprint, snapshot, language, proposal, size, design:snapshot.design || null, version, revision:version, author:'Demostración · este navegador', createdAt:new Date().toISOString()};
      const document = await documentFor(language, catalog, edition), blob = await document.getBlob();
      if (await digest(selected(await readCatalog(), language, proposal, size, design)) !== fingerprint) throw new Error('La carta cambió durante la generación. Actualiza el estado y vuelve a intentar.');
      await save(brand, edition, blob);
      return edition;
    });
    queue = task.catch(() => {});
    return task;
  }
  async function download(id) {
    const [edition, blob] = await Promise.all([stored(brand, 'editions', id), stored(brand, 'files', id)]);
    if (!blob || !edition) throw new Error('Esta edición no está disponible en este navegador. Genera el PDF de nuevo.');
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${brand}-menu-${edition.proposal || 'archivo'}-${edition.size || 'A4'}-${edition.language}-r${edition.version}.pdf`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function preview(language, popup, print = false, proposal = 'actual', size = 'A4', design = null) {
    if (!popup) throw new Error('Permite abrir pestañas para ver e imprimir el menú. También puedes descargar el PDF.');
    try {
      popup.opener = null;
      popup.document.title = 'Preparando menú para imprimir';
      popup.document.body.textContent = 'Preparando la carta completa…';
      const catalog = await readCatalog(), doc = await documentFor(language, catalog, {version:revision(catalog), createdAt:new Date().toISOString(), ...normalizePrintSelection(proposal, size, design, brand)});
      if (print) await doc.print(popup); else await doc.open(popup);
    } catch (error) { popup.close(); throw error; }
  }
  return { status, generate, download, preview };
}
