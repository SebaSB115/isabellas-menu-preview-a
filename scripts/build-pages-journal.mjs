import {cp,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const repo=resolve(import.meta.dirname,'..'),source=resolve(repo,'preview-a'),target=resolve(repo,'docs');
await cp(resolve(source,'design-lab'),resolve(target,'design-lab'),{recursive:true,force:true});
for(const name of ['index.html','entry.js','borrador-1.html'])await copyFile(resolve(source,name),resolve(target,name));
const currentMenu='./journal-fluido.html';
for(const oldPage of ['journal.html','il-libro.html']){
  await writeFile(resolve(target,'design-lab',oldPage),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=${currentMenu}"><title>Carta de Isabella's</title></head><body><a href="${currentMenu}">Abrir la carta actual</a></body></html>\n`);
}
await writeFile(resolve(target,'borrador-1.html'),`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=./"><title>Carta de Isabella's</title></head><body><a href="./">Abrir la carta actual</a></body></html>\n`);
const flowPath=resolve(target,'design-lab/journal-fluido.js');
let flow=await readFile(flowPath,'utf8');
const request="  const response=await fetch('../api/menu',{cache:'no-store'});\n  if(!response.ok)throw new Error('No se pudo leer la carta.');\n  return response.json();";
if(!flow.includes(request))throw new Error('No se encontro la lectura del catalogo de la carta.');
flow="import {api as demoApi} from '../admin/demo-store.js';\n"+flow.replace(request,"  return demoApi('/api/admin/menu');");
flow=flow.replace('Vista previa local · Carta de consulta','Demo pública · Carta de consulta').replace('Local preview · Informational menu','Public demo · Informational menu');
await writeFile(flowPath,flow);
const hash=createHash('sha256');
for(const name of ['journal-fluido.js','journal-fluido.css','journal-language.js'])hash.update(await readFile(resolve(target,'design-lab',name)));
const revision=hash.digest('hex').slice(0,12);
await writeFile(flowPath,flow.replace('./journal-language.js','./journal-language.js?v='+revision));
const htmlPath=resolve(target,'design-lab/journal-fluido.html');
let html=await readFile(htmlPath,'utf8');
html=html.replace('Vista previa local · Carta de consulta','Demo pública · Carta de consulta').replace('./journal-fluido.js','./journal-fluido.js?v='+revision).replace('./journal-fluido.css','./journal-fluido.css?v='+revision);
await writeFile(htmlPath,html);
await writeFile(resolve(target,'design-lab/release.json'),JSON.stringify({menu:'continuous',revision})+'\n');
console.log('Carta unica de Isabella publicada desde Journal continuo: '+revision);
