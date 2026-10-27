import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { dataDir, readCatalog } from './menu-store.mjs';
import { launchBrowser } from './qa-browser-support.mjs';
import QRCode from 'qrcode';

const archive = resolve(dataDir, 'print-editions');
const root = new URL('../preview-a/', import.meta.url);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible = catalog => catalog.categories.filter(c => c.visible !== false).map(c => ({
  id:c.id, title:c.title, items:c.items.filter(i => i.visible !== false).map(({ id, name, description, price, options, addon }) => ({ id, name, description, price, options, addon }))
}));
export const printFingerprint = catalog => createHash('sha256').update(JSON.stringify({categories:visible(catalog),publicUrl:catalog.settings?.publicUrl||''})).digest('hex');
const money = price => price == null ? null : '₡' + new Intl.NumberFormat('en-US').format(price);
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
export async function printHtml(catalog, language = 'es', edition = {}) {
  if (!['es','en'].includes(language)) throw Object.assign(new Error('Idioma no válido.'), {status:400});
  const en=language==='en', tx=map=>map?.[language] || map?.es || '', price=p=>escape(money(p) || (en?'Ask for price':'Consultar precio'));
  const logo=await readFile(new URL('central/assets/isabella-logo-transparent.png',root));
  const qr=catalog.settings?.publicUrl?await QRCode.toDataURL(catalog.settings.publicUrl,{width:360,margin:4,errorCorrectionLevel:'M'}):null;
  const groups=visible(catalog);
  const rows=groups.map((category,index)=>`<section class="chapter"><header><span>ISABELLA’S · ${String(index+1).padStart(2,'0')}</span><h1>${escape(tx(category.title))}</h1></header><div class="dishes">${category.items.map(item=>`<article><div class="dish-title"><h2>${escape(tx(item.name))}</h2>${item.options?.length?'':`<strong>${price(item.price)}</strong>`}</div><p>${escape(tx(item.description))}</p>${(item.options||[]).map(o=>`<div class="variant"><span>${escape(tx(o.label))}</span><strong>${price(o.price)}</strong></div>`).join('')}${item.addon?`<div class="variant"><span>${escape(tx(item.addon.label))}</span><strong>${price(item.addon.price)}</strong></div>`:''}</article>`).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isabella’s · ${en?'Printed menu':'Menú impreso'}</title><style>
  @page{size:A4;margin:18mm 17mm 20mm}*{box-sizing:border-box}body{margin:0;color:#30272a;background:#fff;font:11pt/1.5 Arial,sans-serif}h1,h2{font-family:Georgia,serif;font-weight:400}header>span,.edition{font:9pt/1.6 Arial,sans-serif;letter-spacing:.12em;color:#6a3448}h1{font-size:32pt;line-height:1.1;color:#592f3e;margin:5mm 0 9mm}.cover{min-height:245mm;break-after:page;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center}.cover img{width:85mm;height:auto}.cover h1{margin-top:18mm;font-size:40pt}.cover p{max-width:115mm}.index{margin:10mm 0;display:grid;grid-template-columns:1fr 1fr;gap:3mm 12mm;text-align:left}.chapter{break-before:page}.chapter header{border-bottom:.3mm solid #ac8995;margin-bottom:8mm}.dishes{column-count:2;column-gap:12mm}article{break-inside:avoid;margin:0 0 9mm;padding:0}.dish-title,.variant{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4mm;align-items:baseline;width:100%}.dish-title h2,.variant span{min-width:0;overflow-wrap:anywhere}h2{font-size:15pt;line-height:1.2;margin:0;overflow-wrap:anywhere}.dish-title strong,.variant strong{white-space:nowrap;font-size:10pt}p{margin:2mm 0 0;overflow-wrap:anywhere}.variant{font-size:10pt;margin-top:2mm}.edition{margin-top:12mm}.screen-note{background:#eee;padding:16px;text-align:center;font-size:14px}@media screen{body{max-width:210mm;margin:auto;padding:20px}.chapter{padding:24px 0}.cover{min-height:700px}}@media screen and (max-width:600px){.dishes{column-count:1}.cover img{max-width:80%;width:280px}.cover{min-height:500px}.index{grid-template-columns:1fr}h1{font-size:32px}.screen-note{margin:-20px -20px 20px}}@media print{.screen-note{display:none}}
  </style><body><div class="screen-note">${en?'Print preview · A4 portrait · Use the administration to create an archived PDF.':'Vista previa · A4 vertical · Genera la edición PDF desde la administración.'}</div><section class="cover"><img src="data:image/png;base64,${logo.toString('base64')}" alt="Isabella’s"><h1>${en?'At the table':'A la mesa'}</h1><p>${en?'Italian cooking · Menu':'Cocina italiana · La carta'}</p><div class="index">${groups.map((c,i)=>`<span>${String(i+1).padStart(2,'0')} &nbsp; ${escape(tx(c.title))}</span>`).join('')}</div><p>${en?'Prices in Costa Rican colones. Taxes included; 10% service not included.':'Precios en colones costarricenses. Incluyen impuestos; no incluyen 10 % de servicio.'}</p>${qr?`<figure style="margin:6mm 0 0"><img src="${qr}" style="width:30mm" alt="QR"><figcaption style="font-size:9pt">${en?'Explore our digital menu':'Consulta la carta digital'}</figcaption></figure>`:''}<p class="edition">${escape(edition.createdAt ? new Date(edition.createdAt).toLocaleDateString(language==='es'?'es-CR':'en-US') : 'Vista previa')} · ${en?'Revision':'Revisión'} ${catalog.version}</p></section>${rows}</body></html>`;
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
      await page.setContent(await printHtml(catalog,language,edition),{waitUntil:'load'});
      await page.emulateMediaType('print');
      const pdf=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:9px;width:100%;text-align:center;color:#66515a">Isabella’s · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
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
