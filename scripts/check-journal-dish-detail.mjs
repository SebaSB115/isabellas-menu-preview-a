import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './qa-browser-support.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.env.ISABELLA_READER_URL||'http://127.0.0.1:4194';
const catalog=await fetch(source+'/api/menu').then(response=>response.json());
const temp=await mkdtemp(resolve(tmpdir(),'isabella-dish-detail-'));
const output=resolve(root,'../artifacts/isabella-journal-dish-detail-2026-10-26');
await mkdir(output,{recursive:true});
const salad=catalog.categories.find(group=>group.id==='salads');
const photo=salad.items.find(item=>item.id==='caesar-salad');
const noPhoto=salad.items.find(item=>item.id==='tomato-soup');
const long=salad.items.find(item=>item.id==='caprese-salad');
const variant=catalog.categories.flatMap(group=>group.items).find(item=>item.id==='milanese');
const pending=catalog.categories.flatMap(group=>group.items).find(item=>item.id==='salmon-ravioli');
const created=catalog.categories.flatMap(group=>group.items).find(item=>item.id==='product-84242bf8');
assert(photo&&noPhoto&&long&&variant&&pending);
// Visual fixture only: generated test photography, never an official photo or a catalog edit.
const samplePhoto='data:image/webp;base64,'+(await readFile(resolve(root,'scripts/fixtures/caesar-salad-ai-fixture.webp'))).toString('base64');
photo.photo={src:samplePhoto,x:50,y:50};
long.description.es='Descripción extensa de prueba para comprobar la lectura, el desplazamiento interno y la recuperación de la posición en la carta. '.repeat(18);
catalog.version=992;
await writeFile(resolve(temp,'menu.json'),JSON.stringify(catalog));
const port=4197,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve-preview-a-admin.mjs'],{cwd:root,windowsHide:true,env:{...process.env,ISABELLA_DATA_DIR:temp,ISABELLA_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let serverErrors='';server.stderr.on('data',data=>serverErrors+=data);
let browser;
const report={source:'isolated temporary catalog; the salad image is AI-generated test photography, not an official product photo',checks:[],screenshots:[],errors:[]};
try{
  let ready=false;
  for(let attempt=0;attempt<80;attempt++){
    try{ready=(await fetch(base+'/api/menu')).ok;if(ready)break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert(ready,serverErrors||'Isolated preview did not start');
  browser=await launchBrowser();
  const page=await browser.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.errors.push(error.message));
  const axe=await readFile(resolve(root,'node_modules/axe-core/axe.min.js'),'utf8');
  for(const width of [320,390,768,1024,1440]){
    await page.setViewport({width,height:width<768?844:900,deviceScaleFactor:1});
    for(const [caseName,item] of [['foto-muestra',photo],['sin-foto',noPhoto],['variantes',variant]]){
      await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
      const trigger=`[data-dish="${item.id}"] [data-detail]`;
      await page.waitForSelector(trigger);
      await page.$eval(trigger,button=>button.scrollIntoView({block:'center',behavior:'instant'}));
      await page.evaluate(()=>{window.__readingPosition=window.scrollY;});
      await page.click(trigger);
      const state=await page.evaluate(()=>{
        const dialog=document.querySelector('#dish-dialog'),close=dialog.querySelector('[data-close-detail]');
        const rect=close.getBoundingClientRect();
        return {open:dialog.open,scrollLocked:getComputedStyle(document.body).position==='fixed',name:dialog.querySelector('h2')?.textContent,hasPhoto:!!dialog.querySelector('.detail-figure'),horizontal:dialog.scrollWidth>dialog.clientWidth+1||document.documentElement.scrollWidth>document.documentElement.clientWidth+1,closeVisible:rect.top>=0&&rect.bottom<=innerHeight&&rect.left>=0&&rect.right<=innerWidth,focusInside:dialog.contains(document.activeElement)};
      });
      assert(state.open&&state.scrollLocked&&!state.horizontal&&state.closeVisible&&state.focusInside,`${width} ${caseName}: ${JSON.stringify(state)}`);
      assert.equal(state.hasPhoto,caseName==='foto-muestra');
      assert(state.name.includes(item.name.es));
      if(caseName==='variantes')assert.equal(await page.$$eval('#dish-dialog .dish-dialog__option',nodes=>nodes.length),2);
      if([390,1440].includes(width)){
        const filename=`detalle-${caseName}-${width}.png`;
        await page.screenshot({path:resolve(output,filename)});
        report.screenshots.push(filename);
      }
      if(width===390){
        await page.evaluate(axe);
        const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(value=>({id:value.id,targets:value.nodes.map(node=>node.target)}));});
        assert.deepEqual(violations,[],`${caseName}: axe violations ${JSON.stringify(violations)}`);
        await page.keyboard.press('Tab');
        const tabFocus=await page.evaluate(()=>({inside:document.querySelector('#dish-dialog').contains(document.activeElement),tag:document.activeElement?.tagName,id:document.activeElement?.id,open:document.querySelector('#dish-dialog').open}));
        assert(tabFocus.inside,`${caseName}: focus after Tab ${JSON.stringify(tabFocus)}`);
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('#dish-dialog').open&&getComputedStyle(document.body).position!=='fixed');
      const restored=await page.evaluate(id=>({closed:!document.querySelector('#dish-dialog').open,scroll:window.scrollY,before:window.__readingPosition,focus:document.activeElement?.dataset.detail,body:getComputedStyle(document.body).position}),item.id);
      assert(restored.closed&&Math.abs(restored.scroll-restored.before)<=1&&restored.focus===item.id&&restored.body!=='fixed',`${width} ${caseName}: ${JSON.stringify(restored)}`);
      report.checks.push(`${width} ${caseName}: open, layout, focus, Escape, scroll restoration`);
    }
  }
  await page.setViewport({width:390,height:844});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.click(`[data-dish="${long.id}"] [data-detail]`);
  assert(await page.$eval('#dish-dialog',dialog=>dialog.scrollHeight>dialog.clientHeight),'Long text should scroll in dialog');
  await page.$eval('#dish-dialog',dialog=>{dialog.scrollTop=150;});
  assert(await page.$eval('#dish-dialog',dialog=>dialog.scrollTop>0));
  assert(await page.$eval('#dish-dialog [data-close-detail]',close=>close.getBoundingClientRect().top>=0));
  await page.click('[data-close-detail]');
  report.checks.push('Long text scrolls inside detail; close control stays visible');
  for(const lang of ['es','en']){
    await page.goto(base+'/design-lab/journal-fluido.html?lang='+lang,{waitUntil:'networkidle0'});
    await page.click(`[data-dish="${variant.id}"] [data-detail]`);
    const state=await page.evaluate(()=>({dir:document.documentElement.dir,options:[...document.querySelectorAll('.dish-dialog__option')].map(node=>node.textContent.trim()),horizontal:document.querySelector('#dish-dialog').scrollWidth>document.querySelector('#dish-dialog').clientWidth+1}));
    assert.equal(state.dir,'ltr');
    assert.equal(state.options.length,2);
    assert(!state.horizontal);
    await page.click('[data-close-detail]');
    report.checks.push(`${lang}: translated variant detail and close button`);
  }
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.click(`[data-dish="${pending.id}"] [data-detail]`);
  assert(await page.$eval('#dish-dialog .price--missing',node=>node.textContent.includes('Consultar precio')));
  await page.click('[data-close-detail]');
  report.checks.push('Pending price shown without invented amount');
  for(let i=0;i<3;i++){
    await page.click(`[data-dish="${photo.id}"] [data-detail]`);
    await page.click('[data-close-detail]');
  }
  report.checks.push('Repeated open and close');
  if(created?.detailEnabled&&created.photo?.src){
    await page.goto(source+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
    await page.$eval(`[data-dish="${created.id}"] [data-detail]`,button=>button.scrollIntoView({block:'center',behavior:'instant'}));
    assert.equal(await page.$$eval(`[data-dish="${created.id}"] img`,images=>images.length),0);
    await page.screenshot({path:resolve(output,'producto-admin-lista-sin-foto-390.png')});
    report.screenshots.push('producto-admin-lista-sin-foto-390.png');
    const before=await page.$eval(`[data-dish="${created.id}"]`,node=>({top:node.getBoundingClientRect().top,scroll:window.scrollY}));
    await page.click(`[data-dish="${created.id}"] [data-detail]`);
    const after=await page.$eval(`[data-dish="${created.id}"]`,node=>({top:node.getBoundingClientRect().top,scroll:window.scrollY}));
    assert(Math.abs(after.top-before.top)<=2,`Created product backdrop moved on opening: ${JSON.stringify({before,after})}`);
    await page.waitForFunction(()=>{const image=document.querySelector('#dish-dialog .detail-figure img');return image?.complete&&image.naturalWidth>0;});
    await page.$eval('#dish-dialog .detail-figure img',image=>image.decode());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert(await page.$eval('#dish-dialog .detail-figure img',image=>image.complete&&image.naturalWidth>0));
    await page.screenshot({path:resolve(output,'detalle-producto-admin-390.png')});
    report.screenshots.push('detalle-producto-admin-390.png');
    await page.setViewport({width:1440,height:900});
    await page.screenshot({path:resolve(output,'detalle-producto-admin-1440.png')});
    report.screenshots.push('detalle-producto-admin-1440.png');
    await page.click('[data-close-detail]');
    await page.waitForFunction(()=>!document.querySelector('#dish-dialog').open&&getComputedStyle(document.body).position!=='fixed');
    await page.$eval(`[data-dish="${created.id}"] [data-detail]`,button=>button.scrollIntoView({block:'center',behavior:'instant'}));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert(await page.$eval(`[data-dish="${created.id}"]`,node=>{const rect=node.getBoundingClientRect();return rect.top>=0&&rect.top<innerHeight;}));
    await page.screenshot({path:resolve(output,'producto-admin-lista-sin-foto-1440.png')});
    report.screenshots.push('producto-admin-lista-sin-foto-1440.png');
    report.checks.push('Created product opens detail with its assigned uploaded photo on the live local preview');
  }
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.$eval(`[data-dish="${noPhoto.id}"] [data-detail]`,button=>button.scrollIntoView({block:'center',behavior:'instant'}));
  const target=await page.$eval(`[data-dish="${noPhoto.id}"] [data-detail]`,button=>{const box=button.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};});
  await page.touchscreen.tap(target.x,target.y);
  assert(await page.$eval('#dish-dialog',dialog=>dialog.open));
  assert(await page.evaluate(()=>getComputedStyle(document.body).position==='fixed'));
  const close=await page.$eval('[data-close-detail]',button=>{const box=button.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};});
  await page.touchscreen.tap(close.x,close.y);
  await page.waitForFunction(()=>!document.querySelector('#dish-dialog').open&&getComputedStyle(document.body).position!=='fixed');
  report.checks.push('Emulated mobile touch opens and closes without background scrolling');
  assert.deepEqual(report.errors,[]);
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));
  console.log(`PASS: ${report.checks.length} dish-detail checks; ${report.screenshots.length} screenshots.`);
}finally{
  if(browser)await browser.close();
  server.kill();
  await new Promise(resolve=>server.once('exit',resolve));
  const parent=resolve(tmpdir())+sep;
  if(resolve(temp).startsWith(parent)&&basename(temp).startsWith('isabella-dish-detail-'))await rm(temp,{recursive:true,force:true});
}
