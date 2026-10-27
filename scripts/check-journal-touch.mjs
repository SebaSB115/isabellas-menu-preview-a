import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {launchBrowser} from './qa-browser-support.mjs';
const output=await mkdtemp(resolve(tmpdir(),'isabella-touch-'));
const root=resolve(import.meta.dirname,'../docs');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');let file=resolve(root,decodeURIComponent(url.pathname).replace(/^\/isabellas-menu-preview-a\//,''));
  if(!file.startsWith(root+sep))throw Error();if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const live=process.argv.indexOf('--url');
const base=live<0?`http://127.0.0.1:${server.address().port}/isabellas-menu-preview-a/`:process.argv[live+1];
let browser;
const results=[];
try{
  browser=await launchBrowser();let page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let cdp=await page.createCDPSession();
  await page.goto(new URL('admin/',base).href);
  await page.evaluate(async()=>{const {api}=await import('./demo-store.js');const catalog=await api('/api/admin/menu');catalog.categories[0].items.forEach(i=>i.detailEnabled=true);localStorage.setItem('isabella-preview-a-admin-demo-v1',JSON.stringify(catalog));});
  const position=()=>page.$eval('#page-position',e=>Number(e.textContent.split('/')[0]));
  const reset=async(lang='es')=>{const viewport=page.viewport();await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));if(viewport)await page.setViewport(viewport);cdp=await page.createCDPSession();await page.goto(new URL(`design-lab/journal.html?category=salads&lang=${lang}`,base).href);await page.waitForSelector('[data-open-dish]');await page.evaluate(()=>document.fonts.ready);await new Promise(r=>setTimeout(r,200));await page.evaluate(()=>{window.gestureLog=[];for(const type of ['touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,e=>window.gestureLog.push({type,count:e.touches.length,target:e.target.tagName,prevented:e.defaultPrevented,x:e.changedTouches[0]?.clientX,y:e.changedTouches[0]?.clientY}),{passive:true});});};
  async function gesture(selector,dx,dy=0,{cancel=false,multi=false}={}){
    await page.bringToFront();
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const start=await page.$eval(selector,(e,{dx,dy})=>{const r=e.getBoundingClientRect();return {x:Math.min(innerWidth-32,Math.max(100,r.left+Math.min(r.width-8,150))),y:Math.min(innerHeight-100,Math.max(130,r.top+r.height/2))};},{dx,dy});
    const contact=await page.touchscreen.touchStart(start.x,start.y);
    let second;
    if(multi)second=await page.touchscreen.touchStart(start.x+40,start.y+30);
    else for(let step=1;step<=8;step++){
      await contact.move(start.x+dx*step/8,start.y+dy*step/8);
      await new Promise(r=>setTimeout(r,16));
    }
    if(cancel){await page._client().send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});page.touchscreen.removeHandle(contact);}
    else {await second?.end();await contact.end();}
    await new Promise(r=>setTimeout(r,250));
    if(process.env.DEBUG_TOUCH)console.log(selector,dx,dy,await page.evaluate(()=>window.gestureLog?.slice(-2)));
  }
  for(const width of [320,390,768,1024,1440]){
    await page.setViewport({width,height:width<500?844:1100,isMobile:false,hasTouch:false,deviceScaleFactor:1});
    await reset();
    const drag=async(selector,dx,dy=0)=>{
      const p=await page.$eval(selector,e=>{const r=e.getBoundingClientRect();return {x:r.left+Math.min(150,r.width/2),y:r.top+r.height/2};});
      await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:12});await page.mouse.up();
      await new Promise(r=>setTimeout(r,100));
    };
    const mouseStart=await position();
    if(width===390)await page.screenshot({path:resolve(output,'mouse-before-390.png')});
    assert.equal(await page.evaluate(()=>navigator.maxTouchPoints),0,'Must test a non-touch desktop viewport');
    await drag('[data-open-dish]',-80);assert.equal(await position(),mouseStart+1,`Mouse drag over dish failed at ${width}`);
    if(width===390)await page.screenshot({path:resolve(output,'mouse-after-390.png')});
    assert.equal(await page.$('#dish-dialog[open]'),null,'Mouse drag opened detail');
    await drag('#viewer',80);assert.equal(await position(),mouseStart);
    await drag('.journal-photo img',-80);assert.equal(await position(),mouseStart+1,'Native image drag stole page gesture');
    await drag('#viewer',80);assert.equal(await position(),mouseStart);
    await drag('#viewer',4,-65);assert.equal(await position(),mouseStart,'Vertical mouse movement turned page');
    await page.click('[data-open-dish]');await page.waitForSelector('#dish-dialog[open]');await page.click('[data-close-dish]');
    await page.setViewport({width,height:width<500?844:1100,isMobile:width<1024,hasTouch:true,deviceScaleFactor:1});
    await reset();await page.screenshot({path:resolve(output,`before-${width}.png`)});
    await page.evaluate(()=>{window.trustedTouch=false;document.querySelector('#viewer').addEventListener('touchstart',e=>{window.trustedTouch=e.isTrusted;},{once:true});});
    let before=await position();
    await gesture('[data-open-dish]',-80,3);
    assert.equal(await position(),before+1,`Swipe over dish name failed at ${width}`);
    assert(await page.evaluate(()=>window.trustedTouch),'Test must use trusted browser input');
    assert.equal(await page.$('#dish-dialog[open]'),null,'Swipe opened dish detail');
    await gesture('#viewer',80,-2);assert.equal(await position(),before,'Reverse swipe');
    await gesture('.journal-photo img',-80,2);assert.equal(await position(),before+1,'Photo swipe');
    await reset();before=await position();
    for(const [dx,dy,options] of [[8,0,{}],[3,-90,{}]]){
      await gesture('#viewer',dx,dy,options);assert.equal(await position(),before,'Cancelled/vertical/multitouch must not turn page');
    }
    await gesture('[data-open-dish]',0,0);await page.waitForSelector('#dish-dialog[open]');
    await gesture('#dish-dialog',-80,0);assert.equal(await position(),before,'Detail must not turn background page');
    await page.tap('[data-close-dish]');
    assert.equal(await page.$('#dish-dialog[open]'),null);
    if(await page.$eval('#reader-index-toggle',e=>e.getBoundingClientRect().width>0))await page.tap('#reader-index-toggle');
    if(await page.$('#reader-index[open]')){await gesture('#reader-index',-80,0);assert.equal(await position(),before);await page.tap('#reader-index-close');}
    await page.tap('#page-next');assert.equal(await position(),before+1);await page.tap('#page-prev');assert.equal(await position(),before);
    await page.keyboard.press('ArrowRight');assert.equal(await position(),before+1);await page.keyboard.press('ArrowLeft');assert.equal(await position(),before);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width}`);
    if(width<=390)assert.equal(await page.evaluate(()=>scrollY),0,'Mobile reader scrolled unexpectedly');
    await reset('en');before=await position();await gesture('[data-open-dish]',-80,2);assert.equal(await position(),before+1,JSON.stringify({width,state:await page.evaluate(()=>({events:window.gestureLog.slice(-12),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),focus:document.hasFocus(),touches:window.gestureLog.length}))}));
    await page.screenshot({path:resolve(output,`after-${width}.png`)});
    before=await position();await gesture('#viewer',-80,0,{cancel:true});assert.equal(await position(),before);
    await gesture('#viewer',0,0,{multi:true});assert.equal(await position(),before);
    results.push({width,mouseName:true,mousePhoto:true,mouseReverse:true,mouseClickDetail:true,swipeName:true,swipePhoto:true,reverse:true,tapDetail:true,cancel:true,multitouch:true,vertical:true,buttons:true,keyboard:true,ES_EN:true});
    // Isolate device emulation and its multi-contact state between viewports.
    await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));cdp=await page.createCDPSession();
  }
  // Cover/last-page bounds and a full pass using only real touch gestures.
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.goto(new URL('design-lab/journal.html?view=cover&lang=es',base).href);
  await page.waitForSelector('.journal-cover');await new Promise(r=>setTimeout(r,200));
  await gesture('#viewer',80);assert.equal(await position(),1);
  let pages=0;const seen=[];
  while(!await page.$eval('#page-next',e=>e.disabled)){
    seen.push(...await page.$$eval('#viewer [data-dish]',es=>es.map(e=>e.dataset.dish)));
    const before=await position();await gesture('#viewer',-80);assert.equal(await position(),before+1);assert(++pages<100);
  }
  seen.push(...await page.$$eval('#viewer [data-dish]',es=>es.map(e=>e.dataset.dish)));
  const last=await position();await gesture('#viewer',-80);assert.equal(await position(),last);
  const expected=await page.evaluate(async()=>{const {api}=await import('../admin/demo-store.js');return (await api('/api/admin/menu')).categories.filter(c=>c.visible!==false).flatMap(c=>c.items.filter(i=>i.visible!==false).map(i=>i.id)).sort();});
  assert.deepEqual(seen.sort(),expected,'Products lost or duplicated during swipe navigation');
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'report.json'),JSON.stringify({base,results,pages:last,products:seen.length},null,2));
  console.log(JSON.stringify({output,base,results,pages:last,products:seen.length},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
