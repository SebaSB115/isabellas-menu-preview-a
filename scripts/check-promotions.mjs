import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './qa-browser-support.mjs';

// Real Node persistence uses a temporary catalog; the hosted adapter uses a fresh browser context.
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'../artifacts/isabella-promotions');
const data=await mkdtemp(resolve(tmpdir(),'isabella-promotions-'));
const password=randomBytes(24).toString('hex'),salt=randomBytes(32).toString('hex');
await writeFile(resolve(data,'admin-auth.json'),JSON.stringify({username:'qa-promotions',salt,hash:scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')}));
await mkdir(out,{recursive:true});
const docs=resolve(root,'docs');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const staticServer=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!path.startsWith('/isabella/'))throw new Error('prefix');
    let file=resolve(docs,path.slice('/isabella/'.length));
    if(file!==docs&&!file.startsWith(docs+sep))throw new Error('path');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>staticServer.listen(0,'127.0.0.1',r));
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));
const port=socket.address().port;await new Promise(r=>socket.close(r));
const nodeBase=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,['scripts/serve-preview-a-admin.mjs'],{cwd:root,windowsHide:true,env:{...process.env,ISABELLA_DATA_DIR:data,ISABELLA_PREVIEW_PORT:String(port)},stdio:'ignore'});
let browser;
const results=[];
const es='Promoción de prueba · Pasta y bebida. Consulta las condiciones con el personal.';
const en='Test offer · Pasta and a drink. Ask our staff for the conditions.';
try{
  for(let i=0;i<100;i++){try{if((await fetch(nodeBase+'api/menu')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await launchBrowser();
  for(const [mode,base,username,pass] of [['node',nodeBase,'qa-promotions',password],['static',`http://127.0.0.1:${staticServer.address().port}/isabella/`,'demo-isabella','vista2026']]){
    console.log('Testing '+mode);
    const context=await browser.createBrowserContext(),admin=await context.newPage(),errors=[];
    for(const p of [admin]){p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);}
    const fill=async(name,value)=>{await admin.bringToFront();return admin.$eval(`[name="${name}"]`,(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);};
    const save=async()=>{await admin.bringToFront();await admin.click('#edit-form [type=submit]');await admin.waitForFunction(()=>!document.querySelector('#edit-form[aria-busy]')&&document.querySelector('#edit-form [type=submit]').disabled);};
    const tab=async(name)=>{await admin.bringToFront();await admin.click('#sidebar-toggle');await admin.bringToFront();await admin.click(`[data-tab="${name}"]`);};
    const readCatalog=()=>mode==='node'?fetch(base+'api/menu').then(r=>r.json()):admin.evaluate(async()=>{const {api}=await import('./demo-store.js');return api('/api/admin/menu');});
    await admin.setViewport({width:1440,height:1000});
    await admin.goto(base+'admin/#promociones');await admin.type('#username',username);await admin.type('#password',pass);await admin.bringToFront();await admin.click('#login-form button[type=submit]');await admin.waitForSelector('#promotion-preview-text');

    const before=await readCatalog();
    assert.equal(await admin.$eval('#page-title',el=>el.textContent),'Promociones');
    await admin.select('#promotion-preview-language','en');assert(await admin.$eval('#edit-form [type=submit]',el=>el.disabled),'Preview language must not mark content dirty');
    await admin.select('#promotion-preview-language','es');
    const menu=await context.newPage();menu.on('pageerror',e=>errors.push(e.message));menu.setDefaultTimeout(12000);
    await menu.goto(base+'design-lab/journal-fluido.html?lang=es');await menu.waitForSelector('[data-dish]');
    assert.equal(await menu.$('.introduction'),null);assert(await menu.$eval('#announcement',el=>el.hidden));
    await admin.bringToFront();
    await admin.bringToFront();await admin.click('[name=enabled]');await admin.bringToFront();await admin.click('#edit-form [type=submit]');await admin.waitForSelector('[name=es][aria-invalid=true]');
    await fill('es',es);await admin.bringToFront();await admin.click('#edit-form [type=submit]');await admin.waitForSelector('[name=en][aria-invalid=true]');
    await fill('en',en);await save();

    const saved=await readCatalog();assert.deepEqual(saved.categories,before.categories,'Saving a promotion must not change the catalog');
    assert.equal(saved.settings.announcement.es,es);
    await admin.bringToFront();await admin.reload();await admin.waitForSelector('#promotion-preview-text');assert.equal(await admin.$eval('[name=es]',el=>el.value),es);
    await menu.bringToFront();await menu.reload();await menu.waitForSelector('#announcement:not([hidden])');assert.equal(await menu.$eval('#announcement-text',el=>el.textContent),es);
    await menu.bringToFront();await menu.click('[data-language=en]');assert.equal(await menu.$eval('#announcement-text',el=>el.textContent),en);
    await menu.bringToFront();await menu.click('[data-language=es]');
    for(const width of [320,390,768,1440]){
      for(const [name,p] of [['admin',admin],['menu',menu]]){
        await p.bringToFront();await p.setViewport({width,height:width<768?844:1000});await p.evaluate(()=>scrollTo(0,0));await p.evaluate(()=>document.fonts.ready);
        const metrics=await p.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
        assert(metrics.scroll<=metrics.width+1,`${mode} ${name} ${width}: ${JSON.stringify(metrics)}`);
        if(width===390||width===1440)await p.screenshot({path:resolve(out,`${mode}-${name}-${width}.png`)});
      }
    }

    await admin.bringToFront();
    await admin.evaluate(await readFile(resolve(root,'node_modules/axe-core/axe.min.js'),'utf8'));
    const violations=await admin.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[],'Promotions form accessibility');
    await fill('es','Cambios sin guardar');await tab('products');await admin.waitForSelector('#changes-dialog[open]');await admin.bringToFront();await admin.click('[data-choice=stay]');
    await admin.bringToFront();await admin.click('[data-tab=products]');await admin.bringToFront();await admin.click('[data-choice=discard]');await admin.waitForSelector('[data-product]');await tab('content');
    assert.equal(await admin.$eval('[name=es]',el=>el.value),es);
    await fill('es','<img src=x onerror=alert(1)> '+es.repeat(2));await save();
    await menu.bringToFront();await menu.reload();await menu.waitForSelector('#announcement:not([hidden])');assert.equal(await menu.$('#announcement img'),null);assert((await menu.$eval('#announcement-text',el=>el.textContent)).startsWith('<img'));
    await fill('es',es);await admin.bringToFront();await admin.click('.promotion-options summary');await admin.bringToFront();await admin.click('[name=moving]');await save();
    await menu.bringToFront();await menu.reload();await menu.waitForSelector('#announcement-pause:not([hidden])');await menu.bringToFront();await menu.click('#announcement-pause');assert.equal(await menu.$eval('#announcement-pause',el=>el.getAttribute('aria-pressed')),'true');
    await admin.bringToFront();await admin.click('[name=enabled]');await save();await menu.bringToFront();await menu.reload();await menu.waitForSelector('[data-dish]');assert(await menu.$eval('#announcement',el=>el.hidden));
    assert.equal((await readCatalog()).settings.announcement.es,es,'Disabling preserves content');
    assert.deepEqual((await readCatalog()).categories,before.categories);
    if(mode==='node'){
      const csrfStatus=await admin.evaluate(async()=> (await fetch('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:'{}'})).status);assert.equal(csrfStatus,403);
      const unauthorized=await fetch(base+'api/admin/content',{method:'PUT',headers:{'content-type':'application/json'},body:'{}'});assert.equal(unauthorized.status,401);
      const stale=await admin.evaluate(async()=>{const session=await fetch('/api/admin/session').then(r=>r.json());return (await fetch('/api/admin/content',{method:'PUT',headers:{'content-type':'application/json','x-csrf-token':session.csrf},body:JSON.stringify({version:0,settings:{}})})).status;});assert.equal(stale,409);
    }
    assert.deepEqual(errors,[]);results.push({mode,widths:[320,390,768,1440],passed:true});
    console.log(`PASS ${mode}: promociones ES/EN, validación, persistencia, catálogo intacto, cambios sin guardar, HTML literal, pausa, ocultar y responsive.`);
    await context.close();
  }
  await writeFile(resolve(out,'results.json'),JSON.stringify(results,null,2));
}catch(error){console.error(error);throw error;}finally{server.kill();staticServer.closeAllConnections();await browser?.close();await new Promise(r=>staticServer.close(r));}
