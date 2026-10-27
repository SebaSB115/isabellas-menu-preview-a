import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import './sync-tabler.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),source=resolve(repo,'preview-a/admin'),target=resolve(repo,'docs/admin');
let html=(await readFile(resolve(source,'index.html'),'utf8')).replace(/\r\n/g,'\n');
html=html.replace('<body>','<body data-static-demo="true">')
  .replace("<title>Central de carta · Isabella's</title>","<title>Demo de la central · Isabella's</title>")
  .replace('ACCESO PRIVADO','ACCESO DE DEMOSTRACIÓN')
  .replace('Vista previa local · Los cambios no se publican en producción.','Demo pública sin autenticación real. Usuario: <strong>demo-isabella</strong> · Contraseña: <strong>vista2026</strong>. Los cambios quedan en este navegador.')
  .replace('<span class="online-dot"></span> Vista previa local<br /><small>Los cambios se guardan en este equipo.</small>','<span class="online-dot"></span> Demo pública<br /><small>Datos de este navegador; no producción.</small>')
  .replace('<button id="logout" type="button">Salir</button>','<button id="reset-demo" type="button">Restablecer demo</button><button id="logout" type="button">Salir</button>')
  .replace('      <main id="main" tabindex="-1">','      <div class="demo-banner" role="note">Demostración pública · Sin autenticación real. Los cambios se guardan en este navegador. La traducción automática y las ediciones PDF requieren el servidor.</div>\n      <main id="main" tabindex="-1">');
let app=(await readFile(resolve(source,'app.js'),'utf8')).replace(/\r\n/g,'\n');
const start=app.indexOf('async function api(path, options = {}) {'),end=app.indexOf('function notice(',start);
if(start<0||end<0)throw new Error('No se encontró el adaptador API.');
app="import { api, resetDemo } from './demo-store.js';\n"+app.slice(0,start)+app.slice(end);
app += "\n$('reset-demo').addEventListener('click',async()=>{if(!await guard())return;if(confirm('¿Restablecer esta demostración en este navegador?')){resetDemo();location.reload();}});\n";
app=app.replace('Al guardar se traduce automáticamente al inglés con el motor local gratuito. Puedes revisar y ajustar la traducción.','En la demo estática, escribe el inglés manualmente. El motor automático está disponible en el servidor local.');
await mkdir(target,{recursive:true});
await Promise.all([writeFile(resolve(target,'index.html'),html),writeFile(resolve(target,'app.js'),app),
  ...['style.css','tabler-workspace.css','form-state.js','demo-store.js'].map(file=>copyFile(resolve(source,file),resolve(target,file)))]);
console.log('Demo generada desde la fuente administrativa y su adaptador estático.');
