import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {launchBrowser} from './qa-browser-support.mjs';
const root=resolve(import.meta.dirname,'../docs'),output=await mkdtemp(resolve(tmpdir(),'isabella-current-menu-'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let file=resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/isabella\//,''));if(!file.startsWith(root+sep)&&file!==root)throw Error();if((await stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const arg=process.argv.indexOf('--url'),base=arg<0?`http://127.0.0.1:${server.address().port}/isabella/`:process.argv[arg+1];
let browser;const report={base,routes:[],widths:[],errors:[]};
try{
 browser=await launchBrowser();const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const path of ['', 'index.html','borrador-1.html','design-lab/journal.html','design-lab/il-libro.html','design-lab/index.html','design-lab/journal-fluido.html']){
  await page.goto(base+path+'?lang=es&category=starters');await page.waitForSelector('#chapters [data-dish]');
  assert(new URL(page.url()).pathname.endsWith('/design-lab/journal-fluido.html'));
  assert.equal(await page.$('#page-next'),null);
  assert.equal(await page.$$eval('a',es=>es.filter(e=>/borrador|il-libro|journal\.html/.test(e.getAttribute('href'))).length),0);
  report.routes.push(path||'/');
 }
 const expected=await page.evaluate(async()=>{const {api}=await import('../admin/demo-store.js');return (await api('/api/admin/menu')).categories.filter(c=>c.visible!==false).flatMap(c=>c.items.filter(i=>i.visible!==false).map(i=>i.id)).sort();});
 for(const width of [320,390,768,1024,1440]){
  await page.setViewport({width,height:width<500?844:1000});await page.goto(base+'?lang=es');await page.waitForSelector('#chapters [data-dish]');await page.evaluate(()=>document.fonts.ready);
  await page.$$eval('.category-figure img',images=>images.forEach(image=>image.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.category-figure img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.deepEqual(await page.$$eval('#chapters [data-dish]',es=>es.map(e=>e.dataset.dish).sort()),expected);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(output,`menu-${width}.png`)});
  if(width===390){await page.click('#index-trigger');await page.waitForSelector('#index-dialog[open]');await page.click('#index-links [data-category-link=starters]');await page.waitForFunction(()=>!document.querySelector('#index-dialog').open);}
  else await page.$eval('#category-starters',e=>e.scrollIntoView({behavior:'instant'}));
  await page.$eval('[data-detail]',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  const y=await page.evaluate(()=>scrollY);await page.click('[data-detail]');await page.waitForSelector('#dish-dialog[open]');await page.keyboard.press('Escape');assert.equal(await page.$('#dish-dialog[open]'),null);await page.waitForFunction(y=>Math.abs(scrollY-y)<2,{},y);
  await page.click('[data-language=en]');assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
  report.widths.push(width);
 }
 await page.goto(base+'admin/');await page.type('#username','demo-isabella');await page.type('#password','vista2026');await page.click('#login-form button[type=submit]');await page.waitForSelector('#app-shell:not([hidden])');
 const href=await page.$eval('.top-actions a',a=>a.href);await page.goto(href);await page.waitForSelector('#chapters [data-dish]');assert(page.url().includes('journal-fluido.html'));report.adminMenu=true;report.products=expected.length;
 assert.deepEqual(report.errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,...report},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
