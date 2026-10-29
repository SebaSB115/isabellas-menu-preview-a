import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile, stat, mkdir, mkdtemp, readdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {launchBrowser} from './qa-browser-support.mjs';
const repo=resolve(import.meta.dirname,'..');
const output=process.env.PRINT_QA_DIR || await mkdtemp(resolve(tmpdir(),'restaurant-browser-print-'));
await mkdir(output,{recursive:true});
const brands=['isabella',...(process.argv.includes('--both')?['boccantina']:[])];
const live=process.argv.includes('--live');
const publicUrls={isabella:'https://sebasb115.github.io/isabellas-menu-preview-a',boccantina:'https://sebasb115.github.io/boccantina-preview'};
const roots={isabella:resolve(repo,'docs'),boccantina:resolve(repo,'../boccantina-preview/docs-v2')};
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),brand=path.split('/')[1];
    if(!roots[brand])throw Error();
    let file=resolve(roots[brand],path.slice(brand.length+2));
    if(file!==roots[brand]&&!file.startsWith(roots[brand]+sep))throw Error();
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    let bytes=await readFile(file);
    // Exercise the published prefix, even on a random local port.
    if(brand==='boccantina'&&['.js','.html','.css'].includes(extname(file)))bytes=Buffer.from(bytes.toString().replaceAll('/boccantina-preview/','/boccantina/').replaceAll('content="/boccantina-preview"','content="/boccantina"'));
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await launchBrowser();
 for(const brand of brands){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const isabella=brand==='isabella',base=live?publicUrls[brand]:`${origin}/${brand}`,dir=resolve(output,brand);
  await mkdir(dir,{recursive:true});await page.setViewport({width:1440,height:1000});
  await page.goto(base+(isabella?'/admin/':'/admin/login/'),{waitUntil:'networkidle0'});
  await page.type('#username',`demo-${brand}`);await page.type('#password','vista2026');await page.click('[type=submit]');
  await page.waitForSelector(isabella?'#app-shell:not([hidden])':'#sidebar-toggle');
  await page.waitForNetworkIdle();
  await page.click('#sidebar-toggle');
  const nav=isabella?'[data-tab=print]':'[data-view=print]';
  await page.waitForSelector(nav,{visible:true});await page.click(nav);
  await page.waitForSelector('.print-workspace');
  const selector=isabella?'#print-proposal':'[data-print-proposal]';
  const id='p-71ed913f-b126-44c8-b87c-39283783720'+(isabella?'1':'2');
  await page.select(selector,id);
  await page.waitForSelector('.bot-sheet').catch(async e=>{console.error(brand,errors,await page.$eval('.print-workspace',el=>el.textContent));throw e;});await page.waitForNetworkIdle();
  const integrity=await page.evaluate(()=>{
    const root=document.querySelector('.botanical-menu');
    const expected=[...root.querySelector('template[data-bot-source]').content.querySelectorAll('[data-product-id]')].map(e=>e.dataset.productId);
    const visible=[...root.querySelectorAll('.bot-sheet [data-product-id]')].map(e=>e.dataset.productId);
    return {expected,visible,overflow:[...root.querySelectorAll('.bot-column')].some(e=>e.scrollHeight>e.clientHeight+1),pages:root.querySelectorAll('.bot-sheet').length};
  });
  assert.deepEqual(new Set(integrity.visible),new Set(integrity.expected));assert(!integrity.overflow);
  const generate=isabella?'#generate-print':'[data-generate-print]';
  await page.$eval('[data-print-design="margin"]',el=>{el.value='100';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert(await page.$eval(generate,el=>el.disabled),'Invalid dimensions must block generation');
  assert(await page.$eval('[data-print-design="margin"]',el=>el.getAttribute('aria-invalid')==='true'));
  await page.$eval('[data-print-design="margin"]',el=>{el.value='18';el.dispatchEvent(new Event('change',{bubbles:true}));});
  const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
  await page.waitForFunction(s=>!document.querySelector(s).disabled,{},generate);await page.click(generate);
  await page.waitForSelector('[data-edition]',{timeout:60000});await page.click('[data-edition]');
  for(let i=0;i<100;i++){if((await readdir(dir)).some(f=>f.endsWith('.pdf')))break;await new Promise(r=>setTimeout(r,100));}
  assert((await readdir(dir)).some(f=>f.endsWith('.pdf')));
  for(const width of [320,390,768,1440]){
    await page.setViewport({width,height:1000});await page.waitForNetworkIdle();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${brand} overflow ${width}`);
    await page.screenshot({path:resolve(dir,`editor-${width}.png`),fullPage:true});
  }
  // Full-size paper screenshots, independently of the responsive editor zoom.
  await page.evaluate(()=>document.querySelector('.botanical-menu').style.setProperty('--bot-scale','1'));
  await page.setViewport({width:1800,height:1200});
  await page.evaluate(()=>{const root=document.querySelector('.botanical-menu');document.body.append(root);root.style.width='1123px';root.style.maxWidth='none';root.style.setProperty('--bot-scale','1');root.querySelectorAll('.bot-page').forEach(e=>e.style.height='794px');});
  const sheets=await page.$$('.bot-sheet');for(let i=0;i<sheets.length;i++)await sheets[i].screenshot({path:resolve(dir,`page-${i+1}.png`)});
  assert.deepEqual(errors,[]);await writeFile(resolve(dir,'result.json'),JSON.stringify(integrity,null,2));
  console.log(brand,integrity.pages,'pages',integrity.visible.length,'products',dir);await context.close();
 }
}finally{await browser?.close();server.close();}
console.log('Evidence:',output);
