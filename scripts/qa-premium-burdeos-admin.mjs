import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';

const root=resolve('.');
const output=resolve('../artifacts/isabella-v2-premium-burdeos');
const data=await mkdtemp(resolve(tmpdir(),'isabella-v2-photo-'));
const password=randomBytes(24).toString('base64url');
const salt=randomBytes(32).toString('hex');
await writeFile(resolve(data,'admin-auth.json'),JSON.stringify({
  username:'qa-photo',salt,hash:scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')
}));
await mkdir(output,{recursive:true});
const port=4196;
const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve-preview-a-admin.mjs'],{
  cwd:root,windowsHide:true,env:{...process.env,ISABELLA_DATA_DIR:data,ISABELLA_PREVIEW_PORT:String(port)},
  stdio:['ignore','pipe','pipe']
});
let serverError='';
server.stderr.on('data',chunk=>serverError+=chunk);
let browser;
try {
  for(let i=0;i<100;i++){
    try{if((await fetch(base+'/api/menu')).ok)break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  browser=await launchBrowser();
  const page=await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewport({width:1440,height:900});
  await page.goto(base+'/admin/');
  await page.type('#username','qa-photo');
  await page.type('#password',password);
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector('#app-shell:not([hidden])');
  await page.click('#sidebar-toggle');
  await page.click('[data-tab=categories]');
  await page.waitForSelector('#editorial-photo-file');
  const before=await page.evaluate(async()=>fetch('/api/menu').then(response=>response.json()));
  const oldArt=before.categories[0].art;
  const file=resolve('preview-a/design-lab/assets/reference-v2/salads-1086.webp');
  await (await page.$('#editorial-photo-file')).uploadFile(file);
  await page.waitForFunction(()=>document.querySelector('#editorial-photo-previews img')?.getAttribute('src')?.includes('/uploads/'),{timeout:20000});
  await page.$eval('#editorial-focus-x',input=>{input.value='61';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.$eval('#editorial-focus-y',input=>{input.value='43';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#edit-form [type=submit]');
  await page.waitForFunction(()=>!document.querySelector('#edit-form[aria-busy]')&&document.querySelector('#edit-form [type=submit]')?.disabled,{timeout:90000});
  const after=await page.evaluate(async()=>fetch('/api/menu').then(response=>response.json()));
  assert.equal(after.categories[0].editorialPhoto.x,61);
  assert.equal(after.categories[0].editorialPhoto.y,43);
  assert.deepEqual(after.categories[0].art,oldArt);
  for(const width of [390,1440]){
    await page.setViewport({width,height:900});
    if(width===390)await page.click('[data-category=salads]');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    assert.equal(overflow,false,`Administración ${width}px`);
    await page.$eval('.category-editorial-photo',section=>section.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:resolve(output,`admin-categoria-${width}.png`)});
  }
  const menu=await browser.newPage();
  await menu.goto(base+'/design-lab/journal-fluido.html?lang=es');
  await menu.waitForFunction(()=>document.querySelector('#category-salads .category-figure img')?.getAttribute('src')?.includes('/uploads/'));
  assert.equal(await menu.$eval('#category-salads .category-figure img',img=>img.style.objectPosition),'61% 43%');
  console.log('PASS: carga, encuadre, guardado y lectura de la foto V2 en datos aislados; el arte anterior permanece intacto. Administración sin desbordamiento a 390 y 1440 px.');
} finally {
  if(browser)await browser.close();
  server.kill();
  if(serverError)console.error(serverError);
}
