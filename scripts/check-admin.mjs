import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const scrypt = promisify(scryptCallback);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(resolve(tmpdir(), 'isabella-admin-qa-'));
const imagePaths = [];
let server;

const port = await new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.on('error', reject);
  socket.listen(0, '127.0.0.1', () => { const number = socket.address().port; socket.close(() => resolvePort(number)); });
});
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(32).toString('hex');
const params = { N:1 << 14, r:8, p:5 };
await writeFile(resolve(temp,'admin-auth.json'), JSON.stringify({ username:'isabella-admin', algorithm:'scrypt', params, salt, hash:(await scrypt(password,Buffer.from(salt,'hex'),64,{ ...params, maxmem:64 * 1024 * 1024 })).toString('hex') }));

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

try {
  server = spawn(process.execPath, [resolve(repo,'scripts/serve-preview-a-admin.mjs')], { cwd:repo, env:{ ...process.env, ISABELLA_DATA_DIR:temp, ISABELLA_PREVIEW_PORT:String(port) }, stdio:'ignore' });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('El servidor de prueba terminó antes de iniciar.');
    try { const health = await request('/api/menu'); if (health.response.ok) break; } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  const initial = await request('/api/menu');
  assert.equal(initial.response.status, 200);
  assert.equal(initial.data.categories.length, 8);
  assert.equal(initial.data.categories.flatMap(category => category.items).length, 55);
  assert.equal((await request('/api/admin/menu')).response.status, 401);
  assert.equal((await request('/api/admin/menu', { method:'PUT', body:'{}' })).response.status, 401);
  assert.equal((await request('/central/isabella/', { redirect:'manual' })).response.status, 303);
  const boccantinaEntry = await request('/central/boccantina/', { redirect:'manual' });
  assert.equal(boccantinaEntry.response.status, 303);
  assert.equal(boccantinaEntry.response.headers.get('location'), `http://127.0.0.1:${Number(process.env.BOCCANTINA_V2_PORT) || 4175}/admin/login/`);
  assert.equal((await request('/api/admin/login', { method:'POST', body:JSON.stringify({ username:'isabella-admin', password:'wrong' }) })).response.status, 401);
  assert.equal((await request('/api/admin/login', { method:'POST', body:JSON.stringify({ username:'boccantina-admin', password }) })).response.status, 401);
  const login = await request('/api/admin/login', { method:'POST', body:JSON.stringify({ username:'isabella-admin', password }) });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const csrf = login.data.csrf;
  const auth = { cookie, 'x-csrf-token':csrf, 'content-type':'application/json' };
  assert.equal((await request('/central/isabella/', { headers:{ cookie } })).response.status, 200);
  const menu = (await request('/api/admin/menu',{ headers:auth })).data;
  assert.equal(menu.version,1);
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:{cookie}, body:JSON.stringify(menu) })).response.status,403);

  const next = structuredClone(menu.categories);
  const originalPrice = next[0].items[0].price;
  next[0].items[0].price = originalPrice + 100;
  const onlySpanish = es => ({ es, en:'', de:'', ar:'', he:'' });
  next.push({ id:'qa-category', title:onlySpanish('Bebidas calientes'), source:'1-PRE.webp', items:[{ id:'qa-product', price:1234, name:onlySpanish('Sopa de tomate'), description:onlySpanish('Tomates asados con albahaca fresca.') }] });
  const saved = await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:menu.version, categories:next }) });
  assert.equal(saved.response.status,200,saved.data.error);
  assert.equal(saved.data.version,2);
  const publicMenu = (await request('/api/menu')).data;
  assert.equal(publicMenu.categories[0].items[0].price,originalPrice + 100);
  const generated = publicMenu.categories.at(-1).items[0];
  assert.equal(generated.name.es,'Sopa de tomate');
  for (const code of ['en','de','ar','he']) {
    assert(generated.name[code]?.trim(), `Falta nombre en ${code}`);
    assert(generated.description[code]?.trim(), `Falta descripción en ${code}`);
    assert(publicMenu.categories.at(-1).title[code]?.trim(), `Falta categoría en ${code}`);
  }
  assert.notEqual(generated.name.en, generated.name.es);
  assert.match(generated.name.ar, /[\u0600-\u06ff]/);
  assert.match(generated.name.he, /[\u0590-\u05ff]/);
  assert.equal((await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:1, categories:next }) })).response.status,409);

  const image = await sharp({ create:{ width:900, height:1200, channels:3, background:'#5c352d' } }).png().toBuffer();
  const uploaded = await request('/api/admin/upload',{ method:'POST', headers:{ cookie, 'x-csrf-token':csrf, 'content-type':'image/png' }, body:image });
  assert.equal(uploaded.response.status,201);
  for (const key of ['src','srcSmall']) {
    imagePaths.push(resolve(repo,'preview-a',uploaded.data.art[key].slice(2)));
    const file = await readFile(imagePaths.at(-1));
    assert(file.length > 100);
  }
  const withArt = structuredClone(saved.data.categories);
  withArt.at(-1).art = { ...uploaded.data.art, x:60, y:35 };
  withArt.at(-1).items[0].visible = false;
  withArt.at(-1).items[0].name.en = 'Injected';
  const artSaved = await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:2, categories:withArt }) });
  assert.equal(artSaved.response.status,200);
  assert.deepEqual(artSaved.data.categories.at(-1).items[0].name, saved.data.categories.at(-1).items[0].name);
  const hidden = (await request('/api/menu')).data.categories.at(-1);
  assert.equal(hidden.items.length,0);
  assert.equal(hidden.art.x,60);
  const renamed = structuredClone(artSaved.data.categories);
  renamed.at(-1).items[0].name.es = 'Sopa de cebolla';
  renamed.at(-1).items[0].name.en = 'Injected';
  const renamedSaved = await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:3, categories:renamed }) });
  assert.equal(renamedSaved.response.status,200);
  assert.notEqual(renamedSaved.data.categories.at(-1).items[0].name.en, saved.data.categories.at(-1).items[0].name.en);
  assert.notEqual(renamedSaved.data.categories.at(-1).items[0].name.en, 'Injected');
  const withoutQaProduct = structuredClone(renamedSaved.data.categories);
  withoutQaProduct.at(-1).items = [];
  const qaProductRemoved = await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:4, categories:withoutQaProduct }) });
  assert.equal(qaProductRemoved.response.status, 200, qaProductRemoved.data.error);
  const withoutQa = qaProductRemoved.data.categories.filter(category => category.id !== 'qa-category');
  assert.equal((await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:qaProductRemoved.data.version, categories:withoutQa }) })).response.status,200);
  assert.equal((await request('/api/menu')).data.categories.length,8);
  assert.equal((await request('/central/usuarios/', { redirect:'manual' })).response.status, 303);
  const staffPassword = randomBytes(18).toString('base64url');
  assert.equal((await request('/admin/personal/', { headers:auth })).response.status, 200);
  assert.deepEqual(Object.keys((await request('/api/central/users', { headers:auth })).data.permissions).sort(), ['isabella.categories','isabella.products']);
  assert.equal((await request('/api/central/users', { method:'POST', headers:auth, body:JSON.stringify({ name:'Acceso ajeno', username:'qa-ajeno', password:staffPassword, permissions:['boccantina.kitchen'], active:true }) })).response.status, 400);
  const created = await request('/api/central/users', { method:'POST', headers:auth, body:JSON.stringify({ name:'Prueba de productos', username:'qa-productos', password:staffPassword, permissions:['isabella.products'], active:true }) });
  assert.equal(created.response.status, 201, created.data.error);
  assert.equal(created.data.user.hash, undefined);
  const staffLogin = await request('/api/admin/login', { method:'POST', body:JSON.stringify({ username:'qa-productos', password:staffPassword }) });
  assert.equal(staffLogin.response.status, 200, staffLogin.data.error);
  assert.deepEqual(staffLogin.data.permissions, ['isabella.products']);
  const staffAuth = { cookie:staffLogin.response.headers.get('set-cookie').split(';')[0], 'x-csrf-token':staffLogin.data.csrf, 'content-type':'application/json' };
  assert.equal((await request('/api/central/users', { headers:staffAuth })).response.status, 403);
  assert.equal((await request('/admin/personal/', { headers:staffAuth })).response.status, 403);
  const staffMenu = (await request('/api/admin/menu', { headers:staffAuth })).data;
  const changedCategory = structuredClone(staffMenu.categories);
  changedCategory[0].title.es = 'Cambio no permitido';
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:staffAuth, body:JSON.stringify({ version:staffMenu.version, categories:changedCategory }) })).response.status, 403);
  const changedProduct = structuredClone(staffMenu.categories);
  changedProduct[0].items[0].price += 100;
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:staffAuth, body:JSON.stringify({ version:staffMenu.version, categories:changedProduct }) })).response.status, 200);
  const afterProduct = (await request('/api/admin/menu', { headers:auth })).data;
  const forbiddenCategory = structuredClone(afterProduct.categories);
  forbiddenCategory.push({ id:'qa-forbidden-category', title:onlySpanish('Categoría no autorizada'), source:'1-PRE.webp', visible:true, items:[] });
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:staffAuth, body:JSON.stringify({ version:afterProduct.version, categories:forbiddenCategory }) })).response.status, 403);
  const forbiddenDeletion = structuredClone(afterProduct.categories);
  forbiddenDeletion[1].items.push(...forbiddenDeletion[0].items);
  forbiddenDeletion.shift();
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:staffAuth, body:JSON.stringify({ version:afterProduct.version, categories:forbiddenDeletion }) })).response.status, 403);
  const unsafeDelete = structuredClone(afterProduct.categories).filter(category => category.id !== afterProduct.categories[0].id);
  const rejectedDelete = await request('/api/admin/menu', { method:'PUT', headers:auth, body:JSON.stringify({ version:afterProduct.version, categories:unsafeDelete }) });
  assert.equal(rejectedDelete.response.status, 400);
  assert.match(rejectedDelete.data.error, /Reasigna todos los productos/);
  const categoryUser = await request('/api/central/users', { method:'POST', headers:auth, body:JSON.stringify({ name:'Prueba de categorías', username:'qa-categorias', password:staffPassword, permissions:['isabella.categories'], active:true }) });
  assert.equal(categoryUser.response.status, 201, categoryUser.data.error);
  const categoryLogin = await request('/api/admin/login', { method:'POST', body:JSON.stringify({ username:'qa-categorias', password:staffPassword }) });
  assert.equal(categoryLogin.response.status, 200, categoryLogin.data.error);
  const categoryAuth = { cookie:categoryLogin.response.headers.get('set-cookie').split(';')[0], 'x-csrf-token':categoryLogin.data.csrf, 'content-type':'application/json' };
  const categoryMenu = (await request('/api/admin/menu', { headers:categoryAuth })).data;
  const forbiddenProduct = structuredClone(categoryMenu.categories);
  forbiddenProduct[0].items[0].price += 100;
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:categoryAuth, body:JSON.stringify({ version:categoryMenu.version, categories:forbiddenProduct }) })).response.status, 403);
  const forbiddenMove = structuredClone(categoryMenu.categories);
  forbiddenMove[1].items.push(forbiddenMove[0].items.shift());
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:categoryAuth, body:JSON.stringify({ version:categoryMenu.version, categories:forbiddenMove }) })).response.status, 403);
  const duplicateCategory = structuredClone(categoryMenu.categories);
  duplicateCategory.push({ id:'qa-duplicate', title:onlySpanish(categoryMenu.categories[0].title.es.toUpperCase()), source:'1-PRE.webp', visible:true, items:[] });
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:auth, body:JSON.stringify({ version:categoryMenu.version, categories:duplicateCategory }) })).response.status, 400);
  const newCategory = structuredClone(categoryMenu.categories);
  newCategory.splice(1, 0, { id:'qa-empty', title:onlySpanish('Categoría de prueba'), source:'1-PRE.webp', visible:true, items:[] });
  const categoryCreated = await request('/api/admin/menu', { method:'PUT', headers:categoryAuth, body:JSON.stringify({ version:categoryMenu.version, categories:newCategory }) });
  assert.equal(categoryCreated.response.status, 200, categoryCreated.data.error);
  assert.equal(categoryCreated.data.categories[1].id, 'qa-empty');
  for (const code of ['es','en','de','ar','he']) assert(categoryCreated.data.categories[1].title[code]?.trim(), `Falta traducción de categoría en ${code}`);
  const withoutEmpty = categoryCreated.data.categories.filter(category => category.id !== 'qa-empty');
  const emptyDeleted = await request('/api/admin/menu', { method:'PUT', headers:categoryAuth, body:JSON.stringify({ version:categoryCreated.data.version, categories:withoutEmpty }) });
  assert.equal(emptyDeleted.response.status, 200, emptyDeleted.data.error);
  const withMove = structuredClone(emptyDeleted.data.categories);
  const from = withMove.shift();
  withMove[0].items.push(...from.items);
  const movedAndDeleted = await request('/api/admin/menu', { method:'PUT', headers:categoryAuth, body:JSON.stringify({ version:emptyDeleted.data.version, categories:withMove }) });
  assert.equal(movedAndDeleted.response.status, 200, movedAndDeleted.data.error);
  assert.equal(movedAndDeleted.data.categories.flatMap(category => category.items).length, 55);
  assert.equal((await request('/api/menu')).data.categories.some(category => category.id === from.id), false);
  assert.equal((await request(`/api/central/users/${created.data.user.id}`, { method:'PATCH', headers:auth, body:JSON.stringify({ name:'Prueba de productos', username:'qa-productos', permissions:['isabella.products'], active:false }) })).response.status, 200);
  assert.equal((await request('/api/admin/session', { headers:staffAuth })).response.status, 401);
  console.log('Central Isabella: autenticación, usuarios, permisos por vista, revocación, CRUD, imágenes y traducciones OK.');
} finally {
  server?.kill();
  for (const path of imagePaths) await unlink(path).catch(() => {});
  const safeBase = resolve(tmpdir()) + sep;
  if (!resolve(temp).startsWith(safeBase)) throw new Error('Ruta temporal fuera del directorio esperado.');
  await rm(temp,{ recursive:true, force:true });
}
