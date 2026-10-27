import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { launchBrowser } from './qa-browser-support.mjs';
const root = new URL('../', import.meta.url);
const data = await mkdtemp(resolve(tmpdir(), 'isabella-tabler-'));
const salt=randomBytes(32).toString('hex'), password=randomBytes(24).toString('base64url');
await writeFile(resolve(data,'admin-auth.json'),JSON.stringify({username:'qa-isabella',salt,hash:scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')}));
const port=4192, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve-preview-a-admin.mjs'],{cwd:root,env:{...process.env,ISABELLA_DATA_DIR:data,ISABELLA_PREVIEW_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
let serverLog=''; server.stderr.on('data',c=>serverLog+=c);
let browser;
const stage=process.argv.includes('--before')?'antes':'despues';
const out=resolve(new URL('../../artifacts/isabella-tabler-2026-10-26/',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1').replaceAll('%20',' '));
await mkdir(out,{recursive:true});
try {
 for(let i=0;i<80;i++){try{if((await fetch(`${base}/api/menu`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await launchBrowser();const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/admin/`);await page.type('#username','qa-isabella');await page.type('#password',password);await page.click('#login-form button[type=submit]');await page.waitForSelector('#app-shell:not([hidden])');
 for(const width of [1440,768,390]){
  await page.setViewport({width,height:1000});
  await page.screenshot({path:resolve(out,`${stage}-productos-${width}.png`),fullPage:false});
 }
 const menu=await browser.newPage();await menu.goto(`${base}/design-lab/journal.html?category=starters&lang=es`);await menu.waitForSelector('.dish-entry');
 for(const width of [1440,768,390]){await menu.setViewport({width,height:1000});await new Promise(r=>setTimeout(r,400));await menu.screenshot({path:resolve(out,`${stage}-carta-${width}.png`)});}
 console.log(JSON.stringify({stage,errors,artifacts:out}));
}finally{await browser?.close();server.kill();if(serverLog)console.log(serverLog.slice(-1000));}
