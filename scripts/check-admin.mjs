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
await writeFile(resolve(temp,'admin-auth.json'), JSON.stringify({ algorithm:'scrypt', salt, hash:(await scrypt(password,Buffer.from(salt,'hex'),64)).toString('hex') }));

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
  assert.equal((await request('/api/admin/login', { method:'POST', body:JSON.stringify({ password:'wrong' }) })).response.status, 401);
  const login = await request('/api/admin/login', { method:'POST', body:JSON.stringify({ password }) });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const csrf = login.data.csrf;
  const auth = { cookie, 'x-csrf-token':csrf, 'content-type':'application/json' };
  const menu = (await request('/api/admin/menu',{ headers:auth })).data;
  assert.equal(menu.version,1);
  assert.equal((await request('/api/admin/menu', { method:'PUT', headers:{cookie}, body:JSON.stringify(menu) })).response.status,403);

  const next = structuredClone(menu.categories);
  const originalPrice = next[0].items[0].price;
  next[0].items[0].price = originalPrice + 100;
  const onlySpanish = es => ({ es, en:'', de:'', ar:'', he:'' });
  next.push({ id:'qa-category', title:onlySpanish('Bebidas calientes'), source:'1-PRE.webp', items:[{ id:'qa-product', price:1234, name:onlySpanish('Sopa de tomate'), description:onlySpanish('Tomates asados con albahaca fresca.') }] });
  const saved = await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:menu.version, categories:next }) });
  assert.equal(saved.response.status,200);
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
  const withoutQa = structuredClone(renamedSaved.data.categories).filter(category => category.id !== 'qa-category');
  assert.equal((await request('/api/admin/menu',{ method:'PUT', headers:auth, body:JSON.stringify({ version:4, categories:withoutQa }) })).response.status,200);
  assert.equal((await request('/api/menu')).data.categories.length,8);
  console.log('Central Isabella: autenticación, permisos, CRUD, imágenes, concurrencia y traducciones automáticas OK.');
} finally {
  server?.kill();
  for (const path of imagePaths) await unlink(path).catch(() => {});
  const safeBase = resolve(tmpdir()) + sep;
  if (!resolve(temp).startsWith(safeBase)) throw new Error('Ruta temporal fuera del directorio esperado.');
  await rm(temp,{ recursive:true, force:true });
}
