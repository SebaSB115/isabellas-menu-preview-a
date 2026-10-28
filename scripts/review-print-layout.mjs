import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchBrowser} from './qa-browser-support.mjs';
import {printHtml} from './print-menu.mjs';
import {projectMenu} from '../preview-a/print-menu/layout.js';
const out=resolve(import.meta.dirname,'../../artifacts/isabella-print-redesign-20261028');
await mkdir(resolve(out,'output/pdf'),{recursive:true});
const catalog=await(await fetch('http://127.0.0.1:4180/api/menu')).json();
const browser=await launchBrowser();
try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
  await page.setRequestInterception(true);
  page.on('request',request=>request.url().endsWith('/print-qa/')?request.respond({status:200,contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body></body></html>'}):request.continue());
  await page.goto('http://127.0.0.1:4180/print-qa/');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async catalog=>{
    const {projectMenu,renderPrintBody,paginatePrint,fitPrintPreview}=await import('/print-menu/layout.js');
    document.querySelectorAll('link[rel=stylesheet]').forEach(n=>n.remove());
    const link=document.createElement('link');link.rel='stylesheet';link.href='/print-menu/style.css';
    await new Promise((r,j)=>{link.onload=r;link.onerror=j;document.head.append(link)});
    document.body.className='isabella-print-document';document.body.innerHTML=renderPrintBody(projectMenu(catalog));
    await paginatePrint(document.querySelector('.isabella-print'));fitPrintPreview(document.querySelector('.isabella-print'));
  },catalog);
  console.log(await page.evaluate(()=>({pages:document.querySelectorAll('.isa-print-sheet').length,products:document.querySelectorAll('.isa-dish').length,columns:[...document.querySelectorAll('.isa-print-column')].map(c=>({height:c.clientHeight,content:c.scrollHeight,count:c.querySelectorAll('.isa-dish').length}))})));
  await (await page.$('.isa-print-page')).screenshot({path:resolve(out,'first-page.png')});
  await page.screenshot({path:resolve(out,'desktop.png'),fullPage:true});
  for(const width of [320,390,768,1024,1440]){
    await page.setViewport({width,height:844});await new Promise(r=>setTimeout(r,150));
    const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    if(result.scroll>width+1)throw new Error('Overflow '+JSON.stringify(result));
    if(width===390)await page.screenshot({path:resolve(out,'mobile.png'),fullPage:true});
  }
  const blob=await page.evaluate(async catalog=>{
    const {definition,project}=await import('/print-menu/service.js');
    const response=await fetch('/central/assets/isabella-logo-transparent.png');
    const image=await response.blob();
    const logo=await new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=j;f.readAsDataURL(image)});
    const def=await definition(project(catalog,'isabella','es'),{version:catalog.version,createdAt:new Date().toISOString()},logo);
    return Array.from(new Uint8Array(await(await window.pdfMake.createPdf(def).getBlob()).arrayBuffer()));
  },catalog);
  await writeFile(resolve(out,'output/pdf/isabella-menu-impreso.pdf'),Buffer.from(blob));
  const fixtures=await page.evaluate(async()=>{
    const {renderPrintBody,paginatePrint,fitPrintPreview}=await import('/print-menu/layout.js');
    const results=[];
    for(const language of ['es','en']){
      for(const count of [0,1,5]){
        const items=Array.from({length:count},(_,i)=>({
          id:'fixture-'+i,name:('Nombre de plato largo '+i+' ').repeat(4),description:i===0?'Descripción con ingredientes y preparación. '.repeat(24):'Descripción breve.',
          price:null,options:i===0?Array.from({length:20},(_,v)=>({label:'Variante '+v+' '+('Descripción de la presentación ').repeat(3),price:5000+v})):[],
          addon:i===0?{label:'Adicional final de prueba',price:1500}:null
        }));
        const snapshot={language,groups:count?[{id:'qa',title:'Categoría de prueba de paginación',items}]:[],publicUrl:''};
        document.body.innerHTML=renderPrintBody(snapshot);const menu=document.querySelector('.isabella-print');
        await paginatePrint(menu);const dispose=fitPrintPreview(menu);
        const variants=[...menu.querySelectorAll('.isa-variant span')].map(n=>n.textContent);
        const descriptions=[...menu.querySelectorAll('.isa-dish p')].map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim();
        const expected=items.map(i=>i.description).join(' ').replace(/\s+/g,' ').trim();
        results.push({language,count,ids:new Set([...menu.querySelectorAll('[data-product-id]')].map(n=>n.dataset.productId)).size,variants:variants.length,fullText:descriptions===expected,lastVariant:!count||variants.at(-1)==='Adicional final de prueba',fits:[...menu.querySelectorAll('.isa-print-column')].every(c=>c.scrollHeight<=c.clientHeight+1),empty:count>0||Boolean(menu.querySelector('.isa-print-empty'))});
        dispose();
      }
    }
    return results;
  });
  if(!fixtures.every(f=>f.ids===f.count&&f.variants===(f.count?21:0)&&f.fullText&&f.lastVariant&&f.fits&&f.empty))throw new Error(JSON.stringify(fixtures));
  await writeFile(resolve(out,'fixtures.json'),JSON.stringify(fixtures,null,2));
  const balance=await page.evaluate(async()=>{
    const {renderPrintBody,paginatePrint}=await import('/print-menu/layout.js');
    const results=[];
    for(const language of ['es','en']){
      const items=Array.from({length:9},(_,i)=>({id:'balance-'+i,name:'Café '+i,description:'Café de la casa.',price:2000,options:[],addon:null}));
      document.body.innerHTML=renderPrintBody({language,groups:[{id:'coffee',title:'Café',items}],publicUrl:''});
      await paginatePrint(document.querySelector('.isabella-print'));
      const columns=[...document.querySelectorAll('.isa-print-column')];
      const ids=[...document.querySelectorAll('.isa-dish')].map(n=>n.dataset.productId);
      results.push({language,pages:document.querySelectorAll('.isa-print-sheet').length,counts:columns.map(c=>c.querySelectorAll('.isa-dish').length),order:ids.join(',')===items.map(i=>i.id).join(','),fits:columns.every(c=>c.scrollHeight<=c.clientHeight+1)});
    }
    return results;
  });
  if(!balance.every(r=>r.pages===1&&r.counts.every(n=>n>=4)&&r.order&&r.fits))throw new Error(JSON.stringify(balance));
  await writeFile(resolve(out,'balance.json'),JSON.stringify(balance,null,2));
  const paper=await browser.newPage();
  await paper.setContent(await printHtml(catalog,'es',{},false),{waitUntil:'load'});await paper.emulateMediaType('print');
  const module='data:text/javascript;base64,'+(await readFile(new URL('../preview-a/print-menu/layout.js',import.meta.url))).toString('base64');
  await paper.evaluate(async source=>{const {paginatePrint}=await import(source);await paginatePrint(document.querySelector('.isabella-print'));},module);
  await paper.pdf({path:resolve(out,'local.pdf'),format:'A4',landscape:true,preferCSSPageSize:true,printBackground:true});
  await writeFile(resolve(out,'snapshot.json'),JSON.stringify(projectMenu(catalog),null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log({out,errors});
}finally{await browser.close();}
