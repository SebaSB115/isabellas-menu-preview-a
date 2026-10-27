import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';

const base = process.env.ISABELLA_READER_URL || 'http://127.0.0.1:4194';
const out = resolve('../artifacts/isabella-journal-reader-2026-10-26');
await mkdir(out, { recursive:true });
const browser = await launchBrowser();
const problems = [];
const report = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => problems.push(`JavaScript: ${error.message}`));
  for (const [width,height] of [[320,568],[390,844],[390,667],[768,1024]]) {
    await page.setViewport({ width,height,deviceScaleFactor:1 });
    await page.goto(`${base}/design-lab/journal.html?view=cover&lang=es`, { waitUntil:'networkidle0' });
    await page.waitForSelector('#viewer>section');
    const categoryIds = await page.$$eval('#reader-index-list [data-category]', nodes => nodes.map(node => node.dataset.category).filter(id => id !== 'cover'));
    for (const id of ['cover',...categoryIds]) {
      if (id !== 'cover') {
        if(width<=760){await page.click('#reader-index-toggle');await page.click(`#reader-index-list [data-category="${id}"]`);}
        else await page.click(`#chapter-nav [data-category="${id}"]`);
      }
      const count = await page.$eval('#viewer>section', section => Number(section.dataset.pageCount || 1));
      const seen = new Set();
      for (let index=0; index<count; index++) {
        await page.waitForFunction(() => [...document.querySelectorAll('#viewer img')].every(image => image.complete && image.naturalWidth > 0), { timeout:10000 });
        const metrics = await page.evaluate(() => {
          const viewer=document.querySelector('#viewer'),section=viewer.firstElementChild;
          const viewerBox=viewer.getBoundingClientRect();
          const rows=[...section.querySelectorAll('.dish-entry')];
          return {screen:innerHeight,documentHeight:document.documentElement.scrollHeight,scrollY,
            documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,
            readerHeight:viewer.clientHeight,sectionHeight:section.scrollHeight,
            rows:rows.map(row=>({id:row.dataset.dish,bottom:row.getBoundingClientRect().bottom,top:row.getBoundingClientRect().top})),
            viewerTop:viewerBox.top,viewerBottom:viewerBox.bottom};
        });
        for (const row of metrics.rows) seen.add(row.id);
        const issues=[];
        if(width<=760 && metrics.documentHeight>height+2)issues.push(`document height ${metrics.documentHeight}`);
        if(metrics.documentWidth>metrics.viewportWidth+1)issues.push(`horizontal width ${metrics.documentWidth}`);
        if(width<=760){
          if(metrics.scrollY!==0)issues.push(`scrollY ${metrics.scrollY}`);
          if(metrics.sectionHeight>metrics.readerHeight+2)issues.push(`clipped sheet ${metrics.sectionHeight}/${metrics.readerHeight}`);
          for(const row of metrics.rows)if(row.bottom>metrics.viewerBottom+2||row.top<metrics.viewerTop-2)issues.push(`clipped product ${row.id}`);
        }
        if(issues.length)problems.push(`${width}×${height} ${id} ${index+1}/${count}: ${issues.join(', ')}`);
        if(['cover','salads','cocktails'].includes(id) && [0,1].includes(index)) {
          await page.screenshot({ path:resolve(out,`${id}-${index+1}-${width}x${height}.png`) });
        }
        if(index<count-1)await page.click('#page-next');
      }
      if(id !== 'cover') {
        const expected = await page.evaluate(async id => {
          const menu=await fetch('../api/menu').then(r=>r.json());
          return menu.categories.find(category=>category.id===id).items.filter(item=>item.visible!==false).map(item=>item.id);
        },id);
        for(const productId of expected)if(!seen.has(productId))problems.push(`${width}×${height} ${id}: missing ${productId}; seen ${[...seen].join(',')}`);
        if(seen.size!==expected.length)problems.push(`${width}×${height} ${id}: ${seen.size} rendered, ${expected.length} expected`);
      }
      report.push({width,height,category:id,pages:count,products:seen.size});
    }
    if(width<=760){
      await page.click('#reader-index-toggle');
      assert(await page.$eval('#reader-index',dialog=>dialog.open));
      if(width===390&&height===844)await page.screenshot({path:resolve(out,'indice-390x844.png')});
      await page.keyboard.press('Escape');
      assert(!(await page.$eval('#reader-index',dialog=>dialog.open)));
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'reader-index-toggle');
      await page.click('#page-prev');
      assert.equal(await page.evaluate(()=>scrollY),0);
    }
  }
  await writeFile(resolve(out,'report.json'),JSON.stringify({report,problems},null,2));
  assert.deepEqual(problems,[]);
  console.log(`PASS: ${report.length} category/viewport combinations, no scroll, no clipping, all products.`);
} finally { await browser.close(); }
