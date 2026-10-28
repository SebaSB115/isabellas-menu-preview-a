import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, writeFile, stat, mkdir, mkdtemp, readdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {launchBrowser} from './qa-browser-support.mjs';
const repo=resolve(import.meta.dirname,'..');
const output=process.env.PRINT_QA_DIR || await mkdtemp(resolve(tmpdir(),'restaurant-browser-print-'));
await mkdir(output,{recursive:true});
const brands=['isabella',...(process.argv.includes('--both')?['boccantina']:[])];
const roots={isabella:resolve(repo,'docs'),boccantina:resolve(repo,'../boccantina-preview/docs-v2')};
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),brand=path.split('/')[1];
    if(!roots[brand])throw Error();
    let file=resolve(roots[brand],path.slice(brand.length+2));
    if(file!==roots[brand]&&!file.startsWith(roots[brand]+sep))throw Error();
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    let bytes=await readFile(file);
    // Exercise the published prefix, even on a random local port.
    if(brand==='boccantina'&&['.js','.html','.css'].includes(extname(file)))bytes=Buffer.from(bytes.toString().replaceAll('/boccantina-preview/','/boccantina/').replaceAll('content="/boccantina-preview"','content="/boccantina"'));
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const report=[];
try{
  browser=await launchBrowser();
  for(const brand of brands){
    const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width:1440,height:1000});
    await page.evaluateOnNewDocument(()=>{window.pdfBlobs=[];const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/pdf')window.pdfBlobs.push(blob);return create(blob);};});
    const base=`${origin}/${brand}`;
    const isabella=brand==='isabella',generate=isabella?'#generate-print':'[data-generate-print]',refresh=isabella?'#refresh-print':'[data-refresh-print]',language=isabella?'#print-language':'[data-print-language]';
    const goPrint=async()=>{await page.click('#sidebar-toggle');await page.click(isabella?'[data-tab=print]':'[data-view=print]');await page.waitForSelector('.print-workspace');};
    await page.goto(base+(isabella?'/admin/':'/admin/login/'));
    await page.type('#username',`demo-${brand}`);await page.type('#password','vista2026');await page.click('[type=submit]');
    await page.waitForSelector(isabella?'#app-shell:not([hidden])':'#sidebar-toggle');
    await goPrint();await page.waitForFunction(s=>!document.querySelector(s).disabled,{},generate);
    // Generation is a real UI action; its file is a real download, not a mocked response.
    await page.click(generate);await page.waitForSelector('[data-edition]',{timeout:60000});
    const directory=resolve(output,brand);await mkdir(directory,{recursive:true});
    const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
    await page.click('[data-edition]');
    for(let i=0;i<100;i++){if((await readdir(directory)).some(n=>n.endsWith('.pdf')))break;await new Promise(r=>setTimeout(r,100));}
    const filename=(await readdir(directory)).find(n=>n.endsWith('.pdf'));assert(filename,'PDF download missing');
    const bytes=await readFile(resolve(directory,filename));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    const firstId=await page.$eval('[data-edition]',e=>e.dataset.edition);
    // Read archived data only in this isolated browser profile.
    const snapshot=await page.evaluate(async brand=>{const db=await new Promise((r,j)=>{const q=indexedDB.open(`${brand}-demo-print-v1`);q.onsuccess=()=>r(q.result);q.onerror=j;});return await new Promise(r=>{const q=db.transaction('editions').objectStore('editions').getAll();q.onsuccess=()=>{db.close();r(q.result[0].snapshot);};});},brand);
    await writeFile(resolve(directory,'snapshot.json'),JSON.stringify(snapshot,null,2));
    await page.reload();await page.waitForSelector(isabella?'#app-shell:not([hidden])':'#sidebar-toggle');
    if(!await page.$('.print-workspace'))await goPrint();
    await page.waitForSelector('[data-edition]');assert.equal(await page.$eval('[data-edition]',e=>e.dataset.edition),firstId);
    for(const width of [320,390,768,1440]){
      await page.setViewport({width,height:width<500?844:1000});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${brand} overflows at ${width}`);
      await page.screenshot({path:resolve(directory,`admin-${width}.png`),fullPage:true});
    }
    // All writes below are synthetic, localStorage-only and discarded with this context.
    await page.evaluate(brand=>{
      const key=brand==='isabella'?'isabella-preview-a-admin-demo-v1':'boccantina-v2-public-demo-catalog';
      const data=JSON.parse(localStorage.getItem(key)||'null');
      if(brand==='isabella'){
        const first=data.categories.flatMap(c=>c.items)[0];first.price=7123;data.version++;
      }else{data.products[0].price=7123;data.revision++;}
      localStorage.setItem(key,JSON.stringify(data));
    },brand).catch(async()=>{
      // Seeds are intentionally not persisted until the first edit.
      await page.evaluate(async brand=>{
        const isa=brand==='isabella';const data=isa?await(await import('../admin/demo-store.js')).api('/api/admin/menu'):window.BoccV2DemoCatalog();
        if(isa){data.categories.flatMap(c=>c.items)[0].price=7123;data.version++;}else{data.products[0].price=7123;data.revision++;}
        localStorage.setItem(isa?'isabella-preview-a-admin-demo-v1':'boccantina-v2-public-demo-catalog',JSON.stringify(data));
      },brand);
    });
    await page.click(refresh);await page.waitForFunction(s=>!document.querySelector(s).disabled,{},generate);
    await page.click(generate);await page.waitForFunction(brand=>document.querySelectorAll(brand==='isabella'?'.edition-list [data-edition]':'.print-editions [data-edition]').length===2,{timeout:60000},brand);
    assert.notEqual(await page.$eval('[data-edition]',e=>e.dataset.edition),firstId);
    await page.click('[data-edition]');
    await page.select(language,'en');await page.waitForFunction(s=>!document.querySelector(s).disabled,{},generate);
    await page.click(generate);await page.waitForFunction(brand=>document.querySelectorAll(brand==='isabella'?'.edition-list [data-edition]':'.print-editions [data-edition]').length===3,{timeout:60000},brand);
    await page.click('[data-edition]');
    // Preview must create and open a PDF; print must set the PDF Print action.
    for(const selector of [isabella?'[data-demo-preview]':'[data-preview-print]',isabella?'[data-demo-print]':'[data-browser-print]']){
      const before=await page.evaluate(()=>window.pdfBlobs.length);
      await page.click(selector);
      await page.waitForFunction(n=>window.pdfBlobs.length>n,{timeout:60000,polling:100},before).catch(async error=>{console.error(brand,selector,await page.evaluate(()=>({feedback:document.querySelector('#print-feedback,#feedback')?.textContent,blobs:window.pdfBlobs.length})));throw error;});
      const actual=await page.evaluate(async()=>Array.from(new Uint8Array(await window.pdfBlobs.at(-1).arrayBuffer())));
      const pdf=Buffer.from(actual);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
      if(selector.includes('demo-print')||selector.includes('browser-print'))assert(pdf.toString('latin1').includes('/Print'),'PDF missing print action');
      for(const popup of await context.pages())if(popup!==page)await popup.close();
      await page.bringToFront();
    }
    assert.deepEqual(errors,[]);
    const edgeCases=await page.evaluate(async brand=>{
      const isa=brand==='isabella',module=await import(isa?'../print-menu/service.js':'../v2/shared-print/engine.js');
      const data=isa?await(await import('../admin/demo-store.js')).api('/api/admin/menu'):window.BoccV2DemoCatalog();
      const service=module.createPrintService({brand,readCatalog:()=>data,logo:''});
      let conflict=false,blocked=false;
      try{await service.generate(-1,'es');}catch(error){conflict=error.message.includes('cambió');}
      try{await service.preview('es',null);}catch(error){blocked=error.message.includes('Permite');}
      const first=isa?data.categories[0].items[0]:data.products[0];
      const before=JSON.stringify(module.project(data,brand,'es'));
      first.available=false;
      const availabilityIgnored=before===JSON.stringify(module.project(data,brand,'es'));
      first.visible=false;
      const hiddenExcluded=!module.project(data,brand,'es').groups.some(g=>g.items.some(i=>i.id===first.id));
      const snapshot=module.project(data,brand,'es');
      snapshot.groups=[{id:'qa',title:'Prueba de textos largos y variantes',items:[{id:'long',name:'Plato de prueba con variantes',price:null,description:('Descripción extensa de prueba, ingredientes y preparación. ').repeat(60)+'FIN DEL TEXTO LARGO',options:[{label:'Porción pequeña',price:3500},{label:'Porción grande',price:5900}],addon:null},{id:'pending',name:'Precio pendiente de confirmar',description:'Sin fotografía ni precio inventado.',price:null,options:[],addon:null}]}];
      const logo=isa?'../central/assets/isabella-logo-transparent.png':'../preview/assets/boccantina-logo-transparent.png';
      const image=await new Promise(async r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(await(await fetch(logo)).blob());});
      const doc=window.pdfMake.createPdf(await module.definition(snapshot,{version:1,createdAt:new Date().toISOString()},image));
      const blob=await doc.getBlob();
      return {conflict,blocked,availabilityIgnored,hiddenExcluded,pdf:Array.from(new Uint8Array(await blob.arrayBuffer()))};
    },brand);
    for(const key of ['conflict','blocked','availabilityIgnored','hiddenExcluded'])assert(edgeCases[key],`${brand} ${key}`);
    await writeFile(resolve(directory,'long-text.pdf'),Buffer.from(edgeCases.pdf));
    const proposalSelector=isabella?'#print-add-choice':'[data-print-add-choice]';
    const addButton=isabella?'#print-add':'[data-print-add]';
    const sizeSelector=isabella?'#print-size':'[data-print-size]';
    const proposalSelectorActive=isabella?'#print-proposal':'[data-print-proposal]';
    for(const [proposal,size,expectedWidth] of [['sobria','A3',1190],['editorial','A2',1683]]){
      await page.select(proposalSelector,proposal);await page.click(addButton);
      await page.waitForSelector(`${proposalSelectorActive} option[value=${proposal}]`);
      await page.select(sizeSelector,size);await page.waitForFunction(s=>!document.querySelector(s).disabled,{},generate);
      await page.click(generate);
      await page.waitForFunction(brand=>Boolean(document.querySelector(brand==='isabella'?'#print-current [data-edition]':'.print-download[data-edition]')),{timeout:90000},brand);
      const result=await page.evaluate(async brand=>{
        const selector=brand==='isabella'?'#print-current [data-edition]':'.print-download[data-edition]';
        const id=document.querySelector(selector).dataset.edition;
        const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(`${brand}-demo-print-v1`);request.onsuccess=()=>resolve(request.result);request.onerror=reject;});
        const blob=await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=reject;});db.close();
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      },brand);
      const variantPdf=Buffer.from(result),media=variantPdf.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
      assert(media,`${brand} ${size} missing MediaBox`);
      const dimensions=[Number(media[1]),Number(media[2])];
      assert(dimensions.some(value=>Math.abs(value-(isabella?expectedWidth:size==='A3'?841.89:1190.55))<4),`${brand} ${size} incorrect MediaBox: ${dimensions}`);
      await writeFile(resolve(directory,`${proposal}-${size}.pdf`),variantPdf);
    }
    await page.evaluate(async brand=>{
      const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(`${brand}-demo-print-v1`);request.onsuccess=()=>resolve(request.result);request.onerror=reject;});
      await new Promise((resolve,reject)=>{const transaction=db.transaction('editions','readwrite');transaction.objectStore('editions').put({id:'legacy-qa',fingerprint:'old-design',language:'es',version:1,revision:1,author:'Archivo anterior',createdAt:'2026-10-27T00:00:00.000Z',snapshot:{groups:[]}});transaction.oncomplete=resolve;transaction.onerror=reject;});db.close();
    },brand);
    await page.click(refresh);
    await page.waitForFunction(brand=>!document.querySelector(brand==='isabella'?'#print-feedback':'#feedback')?.textContent?.includes('Consultando'),{},brand);
    assert.equal(await page.$('[data-edition="legacy-qa"]'),null,`${brand}: el PDF antiguo aparece en la interfaz`);
    report.push({brand,download:filename,bytes:bytes.length,products:snapshot.groups.reduce((n,g)=>n+g.items.length,0),widths:[320,390,768,1440],history:true,priceChange:true,english:true,preview:true,printAction:true,proposals:['actual','sobria','editorial'],sizes:['A4','A3','A2']});
    await context.close();
  }
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({output,report},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
