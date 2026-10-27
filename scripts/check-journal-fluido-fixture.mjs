import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './qa-browser-support.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.env.ISABELLA_READER_URL||'http://127.0.0.1:4194';
const fixture=await fetch(source+'/api/menu').then(response=>response.json());
const temp=await mkdtemp(resolve(tmpdir(),'isabella-journal-flow-'));
const output=resolve(root,'../artifacts/isabella-journal-fluido-2026-10-26');
await mkdir(output,{recursive:true});
const first=fixture.categories[0].items[0];
const photoProduct=fixture.categories[0].items[2];
assert(photoProduct,'A salad product is required for the isolated visual fixture');
// A category reference is attached only in this temporary fixture to exercise the photo layout.
photoProduct.photo={src:'./assets/salad-reference.webp',srcSmall:'./assets/salad-reference.webp',x:50,y:50};
first.name.es='Sopa de tomate, albahaca fresca y queso feta con pan crocante de la casa';
first.name.en='Roasted tomato soup with fresh basil and feta cheese, served with house crostini';
first.description.es='Descripción larga de prueba para verificar la lectura sin cortes ni desplazamiento horizontal. '.repeat(7);
first.description.en='Long test description to verify that text stays readable without clipping or horizontal scrolling. '.repeat(7);
first.description.de='Lange Testbeschreibung zur Prüfung der Lesbarkeit ohne abgeschnittene Zeilen oder horizontales Scrollen. '.repeat(7);
first.description.ar='وصف طويل للاختبار للتحقق من عرض النص وقراءته دون اقتطاع أو تمرير أفقي. '.repeat(7);
first.description.he='תיאור ארוך לבדיקה כדי לוודא שהטקסט קריא ואינו נחתך או גורם לגלילה אופקית. '.repeat(7);
photoProduct.detailEnabled=true;
fixture.version=991;
await writeFile(resolve(temp,'menu.json'),JSON.stringify(fixture));
const port=4196,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve-preview-a-admin.mjs'],{cwd:root,windowsHide:true,env:{...process.env,ISABELLA_DATA_DIR:temp,ISABELLA_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let logs='';server.stderr.on('data',data=>logs+=data);
let browser;
const checks=[];
try{
  let ready=false;
  for(let attempt=0;attempt<80;attempt++){
    try{ready=(await fetch(base+'/api/menu')).ok;if(ready)break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert(ready,logs||'The isolated preview did not start');
  browser=await launchBrowser();
  const page=await browser.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [320,390]){
    await page.setViewport({width,height:844});
    await page.goto(base+'/design-lab/journal-fluido.html?lang=es#category-salads',{waitUntil:'networkidle0'});
    const result=await page.evaluate(id=>{
      const row=document.querySelector(`[data-dish="${id}"]`);
      const box=row.getBoundingClientRect();
      return {horizontal:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,clipped:row.scrollHeight>row.clientHeight+1,description:row.querySelector('.dish__description').textContent.length,top:box.top};
    },first.id);
    assert(!result.horizontal&&!result.clipped&&result.description>450,`${width}: long product is readable ${JSON.stringify(result)}`);
    await page.screenshot({path:resolve(output,`texto-largo-${width}.png`)});
    checks.push(`${width}: long text without clipping`);
  }
  for(const language of ['es','en']){
    await page.goto(base+'/design-lab/journal-fluido.html?lang='+language+'#category-salads',{waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(()=>document.documentElement.dir),'ltr');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true);
    checks.push(`${language}: long text reflows`);
  }
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es#category-salads',{waitUntil:'networkidle0'});
  const trigger=`[data-dish="${photoProduct.id}"] [data-detail]`;
  await page.waitForSelector(trigger);
  assert.equal(await page.$$eval(`[data-dish="${photoProduct.id}"] img`,images=>images.length),0);
  await page.$eval(`[data-dish="${photoProduct.id}"]`,node=>{const sticky=Math.max(document.querySelector('#site-header').getBoundingClientRect().bottom,document.querySelector('#category-rail').getBoundingClientRect().bottom);window.scrollBy(0,node.getBoundingClientRect().top-sticky-14);});
  await page.screenshot({path:resolve(output,'producto-sin-foto-lista-fixture-390.png')});
  await page.click(trigger);
  assert(await page.$eval('#dish-dialog',dialog=>dialog.open));
  await page.$eval('#dish-dialog .detail-figure img',image=>image.decode());
  await page.screenshot({path:resolve(output,'detalle-producto-390.png')});
  await page.keyboard.press('Escape');
  assert(!(await page.$eval('#dish-dialog',dialog=>dialog.open)));
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.detail),photoProduct.id);
  checks.push('Product photo appears only in detail; Escape and focus restoration');
  await page.setViewport({width:1440,height:900});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es#category-salads',{waitUntil:'networkidle0'});
  await page.$eval(`[data-dish="${photoProduct.id}"]`,node=>{const sticky=Math.max(document.querySelector('#site-header').getBoundingClientRect().bottom,document.querySelector('#category-rail').getBoundingClientRect().bottom);window.scrollBy(0,node.getBoundingClientRect().top-sticky-14);});
  assert.equal(await page.$$eval(`[data-dish="${photoProduct.id}"] img`,images=>images.length),0);
  await page.screenshot({path:resolve(output,'producto-sin-foto-lista-fixture-1440.png')});
  const updated=structuredClone(fixture);updated.version+=1;
  updated.categories[0].items[0].name.es='Sopa actualizada desde administración de prueba';
  await writeFile(resolve(temp,'menu.json'),JSON.stringify(updated));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('[data-dish="tomato-soup"] h3')?.textContent.includes('administración de prueba'));
  checks.push('Catalog changes become visible without changing real data');
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'fixture-report.json'),JSON.stringify({checks,errors},null,2));
  console.log(`PASS: ${checks.length} isolated-content checks.`);
}finally{
  if(browser)await browser.close();
  server.kill();
  await new Promise(resolve=>server.once('exit',resolve));
  const parent=resolve(tmpdir())+sep;
  if(resolve(temp).startsWith(parent)&&basename(temp).startsWith('isabella-journal-flow-'))await rm(temp,{recursive:true,force:true});
}
