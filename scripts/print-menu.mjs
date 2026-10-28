import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { dataDir, readCatalog } from './menu-store.mjs';
import { launchBrowser } from './qa-browser-support.mjs';
import QRCode from 'qrcode';
import {PRINT_DESIGN_VERSION, visibleCategories as visible, projectMenu, renderPrintBody} from '../preview-a/print-menu/layout.js';

const archive = resolve(dataDir, 'print-editions');
const root = new URL('../preview-a/', import.meta.url);
export const printFingerprint = catalog => createHash('sha256').update(JSON.stringify({layout:PRINT_DESIGN_VERSION,categories:visible(catalog),publicUrl:catalog.settings?.publicUrl||''})).digest('hex');
export async function editions() {
  await mkdir(archive, { recursive:true });
  const files = (await readdir(archive)).filter(f => /^[a-f0-9-]{36}\.json$/.test(f));
  return (await Promise.all(files.map(async file => JSON.parse(await readFile(resolve(archive, file), 'utf8'))))).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export async function printStatus(catalog, lang = 'es') {
  const list = await editions(), latest = list.find(e => e.language === lang), fingerprint = printFingerprint(catalog);
  const rows = data => new Map(data.flatMap(c => [[c.id, JSON.stringify({title:c.title,order:data.indexOf(c)})], ...c.items.map(i => [i.id,JSON.stringify({category:c.id,...i})])]));
  const before = rows(latest?.snapshot.categories || []), after = rows(visible(catalog));
  let added=0, changed=0, removed=0;
  for (const [id,value] of after) { if (!before.has(id)) added++; else if (before.get(id)!==value) changed++; }
  for (const id of before.keys()) if (!after.has(id)) removed++;
  if((latest?.snapshot.settings?.publicUrl||'')!==(catalog.settings?.publicUrl||''))changed++;
  return { version:catalog.version, current:latest?.fingerprint === fingerprint, changes:{added,changed,removed},
    editions:list.map(({snapshot,...edition}) => ({...edition, current:edition.fingerprint===fingerprint})) };
}
export async function printHtml(catalog, language = 'es', edition = {}, interactive = true) {
  const snapshot = projectMenu(catalog, language), en = language === 'en';
  const logo = await readFile(new URL('central/assets/isabella-logo-transparent.png',root));
  const texture = await readFile(new URL('print-menu/assets/ivory-marble.png',root));
  const qrImage = snapshot.publicUrl ? await QRCode.toDataURL(snapshot.publicUrl,{width:360,margin:4,errorCorrectionLevel:'M'}) : null;
  const body = renderPrintBody(snapshot,{logo:'data:image/png;base64,'+logo.toString('base64'),texture:'data:image/png;base64,'+texture.toString('base64'),qrImage});
  let styles = '<link rel="stylesheet" href="/print-menu/style.css">';
  if (!interactive) {
    let css = await readFile(new URL('print-menu/style.css',root),'utf8');
    for(const [url,path] of [['./assets/fraunces-print.ttf','print-menu/assets/fraunces-print.ttf'],['../shared-print/vendor/NotoSans-Regular.ttf','shared-print/vendor/NotoSans-Regular.ttf']]) {
      css = css.replace(url,'data:font/ttf;base64,'+(await readFile(new URL(path,root))).toString('base64'));
    }
    styles = '<style>'+css+'</style>';
  }
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Isabella’s · ${en?'Printed menu':'Menú impreso'}</title>${styles}${interactive?'<script type="module" src="/print-menu/preview.js"></script>':''}</head><body class="isabella-print-document">${interactive?`<div class="isa-print-toolbar"><p id="isa-print-message" role="status">${en?'A4 landscape preview. Create an archived PDF from the administration.':'Vista previa A4 horizontal. Genera la edición PDF desde la administración.'}</p><button id="isa-print-button" type="button" disabled>${en?'Print or save PDF':'Imprimir o guardar PDF'}</button></div>`:''}${body}</body></html>`;
}
let generation = Promise.resolve();
export function generateEdition(version, language, author) {
  const task=generation.then(async()=>{
    const catalog=await readCatalog();
    if(catalog.version!==version) throw Object.assign(new Error('La carta cambió. Actualiza el estado antes de generar.'),{status:409});
    if(!['es','en'].includes(language)) throw Object.assign(new Error('Idioma no válido.'),{status:400});
    const fingerprint=printFingerprint(catalog);
    const existing=(await editions()).find(e=>e.language===language&&e.fingerprint===fingerprint);
    if(existing) return {...existing,snapshot:undefined};
    const edition={id:randomUUID(),createdAt:new Date().toISOString(),language,version,author,fingerprint,snapshot:{...catalog,categories:visible(catalog)}};
    let browser;
    try{
      browser=await launchBrowser();const page=await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request',req=>/^(data:|about:)/.test(req.url())?req.continue():req.abort());
      await page.setContent(await printHtml(catalog,language,edition,false),{waitUntil:'load'});
      await page.emulateMediaType('print');
      const module='data:text/javascript;base64,'+(await readFile(new URL('print-menu/layout.js',root))).toString('base64');
      await page.evaluate(async source=>{const {paginatePrint}=await import(source);await paginatePrint(document.querySelector('.isabella-print'));},module);
      const pdf=await page.pdf({format:'A4',landscape:true,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
      // Metadata is the commit point. Interrupted generation never replaces a previous edition.
      await mkdir(archive,{recursive:true});
      await writeFile(resolve(archive,edition.id+'.pdf'),pdf,{flag:'wx'});
      const temporary=resolve(archive,edition.id+'.tmp');
      await writeFile(temporary,JSON.stringify(edition));
      await rename(temporary,resolve(archive,edition.id+'.json'));
      return {...edition,snapshot:undefined};
    }catch(error){
      if(error.status)throw error;
      console.error('Generación PDF:',error.message);
      throw Object.assign(new Error('No se pudo generar el PDF. Las ediciones anteriores se conservan. Comprueba que Chrome o Chromium esté instalado y vuelve a intentar.'),{status:503});
    }finally{await browser?.close();}
  });generation=task.catch(()=>{});return task;
}
export async function editionPdf(id) {
  if(!/^[a-f0-9-]{36}$/.test(id)||!(await editions()).some(e=>e.id===id)) throw Object.assign(new Error('Edición no encontrada.'),{status:404});
  return readFile(resolve(archive,id+'.pdf'));
}
