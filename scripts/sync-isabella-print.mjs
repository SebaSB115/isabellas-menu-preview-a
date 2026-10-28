import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const repo=resolve(import.meta.dirname,'..'),folder=resolve(repo,'preview-a/print-menu');
const upstream=await readFile(resolve(repo,'preview-a/shared-print/engine.js'),'utf8');
let engine=upstream;
function replace(from,to){if(engine.split(from).length!==2)throw new Error('El motor compartido cambió; revisa la adaptación de Isabella.');engine=engine.replace(from,to);}
replace("new URL('./vendor/', import.meta.url)","new URL('../shared-print/vendor/', import.meta.url)");
replace('return { layout:1, brand, language,','return { layout:PRINT_DESIGN_VERSION, brand, language,');
replace('return pdf.createPdf(definition(project(catalog, brand, language), edition, image));','return pdf.createPdf(await createPrintDefinition(project(catalog, brand, language), edition, image, pdf));');
const start=engine.indexOf('export function definition('),end=engine.indexOf('export function createPrintService');
if(start<0||end<start)throw new Error('No se encontró la definición del PDF compartido.');
engine=engine.slice(0,start)+'export async function definition(snapshot,edition,logo){return createPrintDefinition(snapshot,edition,logo,await renderer());}\n'+engine.slice(end);
engine="import {PRINT_DESIGN_VERSION} from './layout.js';\nimport {createPrintDefinition} from './definition.js';\n"+engine;
const hash=s=>createHash('sha256').update(s).digest('hex');
if(process.argv.includes('--check')){
  if(await readFile(resolve(folder,'service.js'),'utf8')!==engine)throw new Error('Ejecuta node scripts/sync-isabella-print.mjs.');
  console.log('Adaptación de impresión de Isabella verificada.');
}else{
  await writeFile(resolve(folder,'service.js'),engine);
  await writeFile(resolve(folder,'manifest.json'),JSON.stringify({source:'preview-a/shared-print/engine.js',sourceSha256:hash(upstream),script:'scripts/sync-isabella-print.mjs',serviceSha256:hash(engine)},null,2)+'\n');
  console.log('Adaptación de impresión de Isabella actualizada; motor compartido intacto.');
}
