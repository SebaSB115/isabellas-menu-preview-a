import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { launchBrowser } from './qa-browser-support.mjs';
const root=resolve(fileURLToPath(new URL('../docs/',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!path.startsWith('/isabella/'))throw new Error();
    let file=resolve(root,path.slice('/isabella/'.length));
    if(file!==root&&!file.startsWith(root+sep))throw new Error();
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/isabella/';
let browser;
try{
  browser=await launchBrowser();const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844});await page.goto(base+'admin/');
  await page.type('#username','demo-isabella');await page.type('#password','vista2026');await page.click('#login-form button[type=submit]');await page.waitForSelector('#app-shell:not([hidden])');
  await page.click('[data-product]');const original=await page.$eval('[name=price]',e=>e.value);
  await page.$eval('[name=price]',e=>{e.value=7000;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('#edit-form [type=submit]');
  await page.waitForFunction(()=>document.querySelector('#edit-form [type=submit]').disabled);
  await page.reload();await page.waitForSelector('[data-product]');await page.click('[data-product]');
  assert.equal(await page.$eval('[name=price]',e=>e.value),'7000');assert.notEqual(original,'7000');
  await page.click('#sidebar-toggle');await page.click('[data-tab=print]');
  await page.waitForFunction(()=>!document.querySelector('#generate-print').disabled);
  assert(await page.$('[data-demo-preview]'));assert(await page.$('[data-demo-print]'));
  await page.click('#generate-print');await page.waitForSelector('[data-edition]',{timeout:60000});
  assert(await page.$eval('#print-status',e=>e.textContent.includes('actualizado')));
  const menu=await browser.newPage();await menu.goto(base+'design-lab/journal.html?category=salads&lang=es');await menu.waitForSelector('.dish-entry');
  assert(await menu.$eval('#viewer',e=>e.textContent.includes('7,000')));
  assert.equal(await menu.$$eval('[data-language]',e=>e.length),2);
  const proposal=await browser.newPage();await proposal.goto(base+'design-lab/journal-fluido.html?lang=es#category-salads');await proposal.waitForSelector('[data-dish]');
  assert(await proposal.$eval('#chapters',e=>e.textContent.includes('7,000')));
  assert.deepEqual(await proposal.$$eval('#language-switch [data-language]',buttons=>buttons.map(button=>button.dataset.language)),['es','en']);
  assert.equal(await proposal.$eval('#printed-menu',link=>link.hidden),true);
  assert.deepEqual(errors,[]);
  console.log('Demo estática: login, persistencia, cartas compartidas ES/EN, generación PDF e historial funcionales; rutas con prefijo OK.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
