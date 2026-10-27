import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './qa-browser-support.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const mode=process.argv[2];
if(!['before','after'].includes(mode))throw new Error('Usa before o after.');
const output=resolve(root,'../artifacts/isabella-editorial-refinement-2026-10-26',mode);
await mkdir(output,{recursive:true});
const browser=await launchBrowser();
const samples=[];
try{
  const page=await browser.newPage();
  for(const [width,height] of [[320,720],[390,844],[768,1024],[1024,800],[1440,900]]){
    await page.setViewport({width,height,deviceScaleFactor:1});
    for(const id of ['salads','meats','cocktails']){
      await page.goto(`http://127.0.0.1:4194/design-lab/journal-fluido.html?lang=es#category-${id}`,{waitUntil:'networkidle0'});
      await page.waitForSelector(`#category-${id} h2`);
      await page.evaluate(id=>document.getElementById(`category-${id}`).scrollIntoView({block:'start'}),id);
      const photo=await page.$(`#category-${id} .category-figure img`);
      if(photo)await photo.evaluate(async image=>{await image.decode();});
      await new Promise(resolve=>setTimeout(resolve,150));
      const metrics=await page.evaluate(id=>{
        const heading=document.querySelector(`#category-${id} h2`).getBoundingClientRect();
        const header=document.querySelector('#site-header').getBoundingClientRect();
        const rail=document.querySelector('#category-rail').getBoundingClientRect();
        return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,headingTop:heading.top,stickyBottom:Math.max(header.bottom,rail.bottom),title:document.querySelector(`#category-${id} h2`).textContent.trim()};
      },id);
      samples.push({id,width,...metrics});
      await page.screenshot({path:resolve(output,`${id}-${width}.png`)});
    }
  }
  await writeFile(resolve(output,'measurements.json'),JSON.stringify(samples,null,2));
}finally{await browser.close();}
console.log(`Capturas ${mode}: ${samples.length}`);
