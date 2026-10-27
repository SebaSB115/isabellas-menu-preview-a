import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';

const base = process.env.ISABELLA_READER_URL || 'http://127.0.0.1:4194';
const output = resolve('../artifacts/isabella-v2-premium-burdeos');
const widths = [320,390,768,1024,1440];
const ids = ['salads','starters','focaccia','stromboli','pasta','meats','cocktails','coffee'];
await mkdir(output,{recursive:true});
const browser = await launchBrowser();
const results = [];
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  for (const width of widths) {
    await page.setViewport({width,height:900,deviceScaleFactor:1});
    await page.goto(`${base}/design-lab/journal-fluido.html?lang=es&qa=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForSelector('#category-coffee .dish');
    for (const id of ids) {
      await page.$eval(`#category-${id}`,section=>section.scrollIntoView({block:'start',behavior:'instant'}));
      await page.waitForFunction(id => {
        const image=document.querySelector(`#category-${id} .category-figure img`);
        return image?.complete && image.naturalWidth>0;
      },{timeout:15000},id);
    }
    const layout = await page.evaluate(() => {
      const categories = [...document.querySelectorAll('.chapter')];
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        chapters: categories.map(section => {
          const figure = section.querySelector('.category-figure');
          const image = figure?.querySelector('img');
          const heading = section.querySelector('.chapter__heading').getBoundingClientRect();
          const dishes = section.querySelector('.chapter__dishes').getBoundingClientRect();
          const photo = figure?.getBoundingClientRect();
          return {id:section.id,items:section.querySelectorAll('[data-dish]').length,imageLoaded:image?.naturalWidth>0,
            headingX:Math.round(heading.x),headingY:Math.round(heading.y),
            dishesX:Math.round(dishes.x),dishesY:Math.round(dishes.y),
            imageX:Math.round(photo?.x??-1),imageY:Math.round(photo?.y??-1),
            imageWidth:Math.round(photo?.width??0)};
        })
      };
    });
    results.push({width,...layout});
    if (layout.overflow || layout.chapters.length !== ids.length || layout.chapters.some((entry,index) => entry.id !== `category-${ids[index]}` || !entry.imageLoaded || (width>=760 ? entry.imageX<=entry.dishesX : entry.imageY<entry.headingY || entry.dishesY<entry.imageY))) {
      throw new Error(`La composición no pasó a ${width}px: ${JSON.stringify(layout)}`);
    }
    if ([390,1440].includes(width)) {
      for (const id of ['salads','pasta','cocktails']) {
        await page.$eval(`#category-${id}`,section=>section.scrollIntoView({block:'start',behavior:'instant'}));
        await page.waitForFunction(id => {
          const image=document.querySelector(`#category-${id} .category-figure img`);
          return image?.complete && image.naturalWidth>0;
        },{timeout:15000},id);
        await page.screenshot({path:resolve(output,`${id}-${width}.png`)});
      }
      const trigger=await page.$('#category-meats [data-detail]');
      await trigger.click();
      await page.screenshot({path:resolve(output,`ficha-${width}.png`)});
      await page.keyboard.press('Escape');
    }
  }
  for (const width of [390,1440]) {
    await page.setViewport({width,height:900,deviceScaleFactor:1});
    await page.goto(`${base}/design-lab/journal-fluido.html?lang=en`,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForSelector('#category-coffee .dish');
    const english=await page.evaluate(()=>({lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,caption:document.querySelector('#category-salads figcaption')?.textContent}));
    if(english.lang!=='en'||english.overflow||!english.caption?.includes('Sample image'))throw new Error(`Idioma inglés ${width}px: ${JSON.stringify(english)}`);
  }
  await writeFile(resolve(output,'qa.json'),JSON.stringify(results,null,2));
  console.log(`PASS: 8 categorías, 8 imágenes y sin desbordamiento a ${widths.join(', ')} px; español e inglés. Capturas: ${output}`);
} finally {
  await browser.close();
}
