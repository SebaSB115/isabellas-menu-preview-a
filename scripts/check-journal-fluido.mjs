import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';

const base=process.env.ISABELLA_READER_URL||'http://127.0.0.1:4194';
const output=resolve('../artifacts/isabella-journal-fluido-2026-10-26');
await mkdir(output,{recursive:true});
const catalog=await fetch(base+'/api/menu').then(response=>response.json());
const categories=catalog.categories.filter(category=>category.visible!==false);
const products=categories.flatMap(category=>category.items.filter(item=>item.visible!==false));
const browser=await launchBrowser();
const report={catalog:{version:catalog.version,categories:categories.length,products:products.length,missingPrices:products.filter(product=>product.price==null).length},checks:[],errors:[]};
const check=(name,condition)=>{if(!condition)report.errors.push(name);else report.checks.push(name);};
const variantsAlign=page=>page.evaluate(()=>{
  const standard=document.querySelector('#dish-flat-iron .dish__heading>.price');
  const variants=[...document.querySelectorAll('#dish-milanese .dish-options .price')];
  if(!standard||variants.length!==2)return false;
  const edge=document.documentElement.dir==='rtl'?'left':'right';
  return variants.every(price=>Math.abs(price.getBoundingClientRect()[edge]-standard.getBoundingClientRect()[edge])<=2);
});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>report.errors.push('JS: '+error.message));
  const languagePage=await browser.newPage();
  await languagePage.evaluateOnNewDocument(()=>Object.defineProperty(navigator,'language',{get:()=> 'de-DE'}));
  await languagePage.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await languagePage.evaluate(()=>localStorage.removeItem('isabella.journal.language'));
  await languagePage.goto(base+'/design-lab/journal-fluido.html',{waitUntil:'networkidle0'});
  check('Non-Spanish browser opens in English',await languagePage.evaluate(()=>document.documentElement.lang==='en'&&document.querySelectorAll('#language-switch button').length===2&&document.querySelector('#preview-note').textContent.startsWith('Local preview')));
  await languagePage.evaluate(()=>localStorage.setItem('isabella.journal.language','ar'));
  await languagePage.goto(base+'/design-lab/journal-fluido.html?lang=de',{waitUntil:'networkidle0'});
  check('Old unsupported language preference and URL fall back to English',await languagePage.evaluate(()=>document.documentElement.lang==='en'));
  await languagePage.click('#language-switch [data-language="es"]');
  await languagePage.reload({waitUntil:'networkidle0'});
  check('Manual Spanish choice survives reload',await languagePage.evaluate(()=>document.documentElement.lang==='es'&&localStorage.getItem('isabella.journal.language')==='es'));
  await languagePage.evaluate(()=>localStorage.removeItem('isabella.journal.language'));
  const spanishBrowser=await browser.newPage();
  await spanishBrowser.evaluateOnNewDocument(()=>Object.defineProperty(navigator,'language',{get:()=> 'es-CR'}));
  await spanishBrowser.goto(base+'/design-lab/journal-fluido.html',{waitUntil:'networkidle0'});
  check('Spanish browser opens in Spanish',await spanishBrowser.evaluate(()=>document.documentElement.lang==='es'));
  await spanishBrowser.close();
  await languagePage.close();
  for(const [width,height] of [[320,720],[390,844],[768,1024],[1024,800],[1440,900]]){
    await page.setViewport({width,height,deviceScaleFactor:1});
    await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
    await page.waitForSelector('#chapters .chapter');
    const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,chapters:document.querySelectorAll('.chapter').length,products:document.querySelectorAll('[data-dish]').length,htmlOverflow:getComputedStyle(document.documentElement).overflowY,bodyOverflow:getComputedStyle(document.body).overflowY}));
    check(`${width}: no horizontal overflow`,metrics.scrollWidth<=metrics.width+1);
    check(`${width}: native vertical scroll`,metrics.scrollHeight>height&&metrics.bodyOverflow!=='hidden'&&metrics.htmlOverflow!=='hidden');
    check(`${width}: all content`,metrics.chapters===categories.length&&metrics.products===products.length);
    check(`${width}: variant prices share the standard price edge`,await variantsAlign(page));
    await page.screenshot({path:resolve(output,`inicio-${width}.png`)});
    if([390,1440].includes(width)){
      await page.$eval('#dish-milanese',node=>node.scrollIntoView({block:'center',behavior:'instant'}));
      await page.screenshot({path:resolve(output,`precios-variantes-${width}.png`)});
    }
    for(const [name,id] of [['con-foto','salads'],['solo-texto','stromboli'],['carnes','meats'],['larga','cocktails']]){
      await page.goto(base+'/design-lab/journal-fluido.html?lang=es#category-'+id,{waitUntil:'networkidle0'});
      await page.waitForSelector('#category-'+id);
      await page.waitForFunction(id=>document.querySelector('#sidebar-links [aria-current=location]')?.dataset.categoryLink===id,{timeout:3000},id);
      const target=await page.evaluate(id=>({
        top:document.getElementById('category-'+id).getBoundingClientRect().top,
        headingTop:document.querySelector('#category-'+id+' h2').getBoundingClientRect().top,
        stickyBottom:Math.max(document.querySelector('#site-header').getBoundingClientRect().bottom,document.querySelector('#category-rail').getBoundingClientRect().bottom),
        active:document.querySelector('#sidebar-links [aria-current=location]')?.dataset.categoryLink,
        current:document.querySelector('#active-category-name').textContent.trim(),
        railOverflow:document.querySelector('#category-rail').scrollWidth>document.querySelector('#category-rail').clientWidth+1,
      }),id);
      check(`${width}: direct ${id} heading visible`,target.headingTop>=target.stickyBottom+2&&target.top<=target.stickyBottom+55);
      check(`${width}: active ${id} identified`,width<1024?target.current===categories.find(category=>category.id===id)?.title.es:target.active===id);
      if(width<1024)check(`${width}: category control does not clip`,!target.railOverflow);
      if(['salads','cocktails'].includes(id)){
        await page.waitForFunction(id=>{const image=document.querySelector('#category-'+id+' .category-figure img');return image?.complete&&image.naturalWidth>0;},{timeout:5000},id);
        await page.$eval('#category-'+id+' .category-figure img',image=>image.decode());
        check(`${width}: ${id} editorial image loaded`,true);
      }
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await new Promise(resolve=>setTimeout(resolve,120));
      await page.screenshot({path:resolve(output,`${name}-${width}.png`)});
    }
    if(products.some(product=>product.id==='product-84242bf8'&&product.photo?.src))check(`${width}: product photo stays out of the list`,await page.evaluate(()=>!!document.querySelector('#dish-product-84242bf8 [data-detail]')&&!document.querySelector('#dish-product-84242bf8 img')));
    if(width===390){
      await page.click('#index-trigger');
      check('Index opens',await page.$eval('#index-dialog',dialog=>dialog.open));
      await page.screenshot({path:resolve(output,'indice-390.png')});
      await page.keyboard.press('Escape');
      check('Escape closes index',!(await page.$eval('#index-dialog',dialog=>dialog.open)));
      await page.click('#index-trigger');
      await page.click('#index-links [data-category-link="pasta"]');
      await page.waitForFunction(()=>location.hash==='#category-pasta');
      check('Index jumps directly to category',await page.evaluate(()=>!document.querySelector('#index-dialog').open&&document.querySelector('#category-pasta').getBoundingClientRect().top<170));
      await page.waitForFunction(()=>document.activeElement?.id==='heading-pasta',{timeout:2000});
      check('Index selection moves keyboard focus to heading',true);
      const headingBefore=await page.$eval('#heading-pasta',heading=>heading.getBoundingClientRect().top);
      await page.click('#language-switch [data-language="en"]');
      check('English switch updates the menu',await page.evaluate(()=>document.documentElement.lang==='en'&&document.documentElement.dir==='ltr'&&document.querySelector('#language-switch [data-language="en"]').getAttribute('aria-pressed')==='true'));
      check('Language switch preserves the reading position',Math.abs((await page.$eval('#heading-pasta',heading=>heading.getBoundingClientRect().top))-headingBefore)<=2);
      await page.screenshot({path:resolve(output,'english-390.png')});
    }
  }
  for(const lang of ['es','en']){
    await page.goto(base+'/design-lab/journal-fluido.html?lang='+lang+'#category-pasta',{waitUntil:'networkidle0'});
    const result=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,total:document.querySelectorAll('[data-dish]').length,hash:location.hash,visible:!!document.querySelector('#category-pasta')}));
    check(`${lang}: direct URL, language and all dishes`,result.lang===lang&&result.dir==='ltr'&&result.total===products.length&&result.hash==='#category-pasta'&&result.visible);
    for(const width of [320,390,1440]){
      await page.setViewport({width,height:844});
      await page.goto(base+'/design-lab/journal-fluido.html?lang='+lang+'#category-cocktails',{waitUntil:'networkidle0'});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const fit=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,heading:document.querySelector('#category-cocktails h2').getBoundingClientRect().top,sticky:Math.max(document.querySelector('#site-header').getBoundingClientRect().bottom,document.querySelector('#category-rail').getBoundingClientRect().bottom),count:document.querySelectorAll('[data-dish]').length}));
      check(`${lang} at ${width}: reflow and visible chapter`,!fit.overflow&&fit.heading>=fit.sticky-1&&fit.count===products.length);
      check(`${lang} at ${width}: variant price alignment`,await variantsAlign(page));
    }
  }
  await page.setViewport({width:844,height:390});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  check('landscape orientation has no horizontal document scroll',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await page.setViewport({width:320,height:720});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.addStyleTag({content:'body,button,select,a,p,h1,h2,h3,span{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
  check('320px reflow with increased text spacing',await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&document.querySelectorAll('[data-dish]').length>0));
  await page.setViewport({width:768,height:1024});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  check('200% CSS zoom simulation keeps content inside viewport',await page.evaluate(total=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&document.querySelectorAll('[data-dish]').length===total,products.length));
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  await page.focus('#index-trigger');await page.keyboard.press('Enter');
  check('keyboard opens category index',await page.$eval('#index-dialog',dialog=>dialog.open));
  await page.keyboard.press('Escape');
  check('keyboard closes index and restores focus',await page.evaluate(()=>!document.querySelector('#index-dialog').open&&document.activeElement?.id==='index-trigger'));
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await page.goto(base+'/design-lab/journal-fluido.html?lang=es',{waitUntil:'networkidle0'});
  const tap=await page.$eval('#index-trigger',button=>{const box=button.getBoundingClientRect();return {x:box.x+box.width/2,y:box.y+box.height/2};});
  await page.touchscreen.tap(tap.x,tap.y);
  check('touch opens category index',await page.$eval('#index-dialog',dialog=>dialog.open));
  await page.keyboard.press('Escape');
  const axeSource=await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8');
  await page.setViewport({width:390,height:844});
  report.axe={};
  for(const lang of ['es','en']){
    await page.goto(base+'/design-lab/journal-fluido.html?lang='+lang,{waitUntil:'networkidle0'});
    await page.evaluate(axeSource);
    const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(value=>({id:value.id,targets:value.nodes.map(node=>node.target)}));});
    check(`axe WCAG 2.2 AA ${lang} at 390`,violations.length===0);
    report.axe[lang]=violations;
  }
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));
  assert.deepEqual(report.errors,[]);
  console.log(`PASS: ${report.checks.length} visual/functional checks; ${report.catalog.categories} categories, ${report.catalog.products} products.`);
}finally{await browser.close();}
