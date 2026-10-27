import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';

const base=process.env.ISABELLA_READER_URL||'http://127.0.0.1:4194';
const output=resolve('../artifacts/isabella-journal-v2-photo-final');
const css=await readFile(resolve('preview-a/design-lab/journal-fluido.css'),'utf8');
const legacy=css.split('/* A photographic opening')[0];
if(legacy.length===css.length)throw new Error('No se encontró el límite de la propuesta editorial.');
await mkdir(output,{recursive:true});
const browser=await launchBrowser();
const report=[];
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  for(const stage of ['antes','despues'])for(const width of [390,1440]){
    await page.setViewport({width,height:900,deviceScaleFactor:1});
    for(const [name,id] of [['ensaladas','salads'],['pastas','pasta']]){
      await page.goto(`${base}/design-lab/journal-fluido.html?lang=es&capture=${stage}-${width}-${id}#category-${id}`,{waitUntil:'networkidle0'});
      await page.waitForSelector(`#category-${id} .category-figure img`);
      if(stage==='antes')await page.evaluate(styles=>{
        for(const link of document.querySelectorAll('link'))if(link.rel==='stylesheet')link.remove();
        const style=document.createElement('style');style.textContent=styles;document.head.append(style);
      },legacy);
      await page.$eval(`#category-${id} .category-figure img`,image=>image.decode());
      await page.$eval(`#category-${id}`,section=>section.scrollIntoView({block:'start',behavior:'instant'}));
      await page.screenshot({path:resolve(output,`${stage}-${name}-${width}.png`)});
      const section=await page.$(`#category-${id}`);
      await section.screenshot({path:resolve(output,`${stage}-${name}-${width}-completa.png`)});
      report.push({stage,width,name,layout:await page.evaluate(id=>{const section=document.getElementById(`category-${id}`),figure=section.querySelector('.category-figure');return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,count:section.querySelectorAll('[data-dish]').length,imageLoaded:figure.querySelector('img')?.naturalWidth>0,classes:section.className,gridColumn:getComputedStyle(figure).gridColumn,figureX:Math.round(figure.getBoundingClientRect().x)}},id)});
    }
    await page.goto(`${base}/design-lab/journal-fluido.html?lang=es&capture=${stage}-${width}-detail#category-meats`,{waitUntil:'networkidle0'});
    if(stage==='antes')await page.evaluate(styles=>{
      for(const link of document.querySelectorAll('link'))if(link.rel==='stylesheet')link.remove();
      const style=document.createElement('style');style.textContent=styles;document.head.append(style);
    },legacy);
    const photoTrigger=page.locator('[data-dish="product-84242bf8"] [data-detail]');
    await photoTrigger.click();
    await page.$eval('#dish-dialog .detail-figure img',image=>image.decode());
    await page.screenshot({path:resolve(output,`${stage}-ficha-foto-no-verificada-${width}.png`)});
    report.push({stage,width,name:'ficha-foto-no-verificada',layout:await page.evaluate(()=>({overflow:document.querySelector('#dish-dialog').scrollWidth>document.querySelector('#dish-dialog').clientWidth+1,imageLoaded:document.querySelector('#dish-dialog img')?.naturalWidth>0}))});
    await page.keyboard.press('Escape');
  }
  await writeFile(resolve(output,'comparacion.json'),JSON.stringify(report,null,2));
  if(report.some(row=>row.layout.overflow||row.layout.imageLoaded===false))throw new Error('Hay desbordamiento o una foto que no cargó.');
  console.log(`Capturas comparables guardadas en ${output}`);
}finally{await browser.close();}
