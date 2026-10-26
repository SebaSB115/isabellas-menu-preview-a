import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { readCatalog, saveCatalog, dataDir } from './menu-store.mjs';
import { allPermissions, hashPassword, permissionLabels, publicUser, queueUserUpdate, readUsers, verifyUser } from './central-users.mjs';

const scrypt = promisify(scryptCallback);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(repo, 'preview-a');
const authFile = resolve(dataDir, 'admin-auth.json');
const uploadDir = resolve(root, 'assets/uploads');
const explicitPort = process.env.ISABELLA_PREVIEW_PORT;
let port = Number(explicitPort) || 4180;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
const directoryPages = new Map([
  ['/admin/', '/admin/index.html'],
  ['/admin/personal/', '/admin/personal/index.html'],
  ['/central/', '/central/index.html'],
  ['/central/isabella/', '/central/isabella/index.html'],
  ['/central/boccantina/', '/central/boccantina/index.html'],
]);
const sessions = new Map();
const failures = new Map();
const maxBody = 10 * 1024 * 1024;

function headers(extra = {}) {
  return { 'x-content-type-options':'nosniff', 'referrer-policy':'same-origin', 'x-frame-options':'DENY', 'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'", ...extra };
}
function json(response, status, payload, extra = {}) {
  response.writeHead(status, headers({ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...extra }));
  response.end(JSON.stringify(payload));
}
async function body(request, limit = maxBody) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) { const error = new Error('El archivo o formulario supera el límite permitido.'); error.status = 413; throw error; } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function sessionFor(request) {
  const token = /(?:^|; )isabella_admin=([a-f0-9]{64})(?:;|$)/.exec(request.headers.cookie || '')?.[1];
  const session = token && sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.delete(token); return null; }
  session.expires = Date.now() + 8 * 60 * 60 * 1000;
  return { token, ...session };
}
async function liveSession(request) {
  const session = sessionFor(request);
  if (!session || session.role === 'owner') return session;
  const user = (await readUsers()).find(item => item.id === session.userId && item.active);
  if (!user) { sessions.delete(session.token); return null; }
  return { ...session, permissions:user.permissions };
}
async function requireAdmin(request, response, mutate = false, permission = null) {
  const session = await liveSession(request);
  if (!session) { json(response, 401, { error:'Inicia sesión como administrador.' }); return null; }
  if (permission && session.role !== 'owner' && !session.permissions.includes(permission)) { json(response, 403, { error:'Tu cuenta no tiene acceso a esta sección.' }); return null; }
  if (mutate && request.headers['x-csrf-token'] !== session.csrf) { json(response, 403, { error:'Sesión no válida. Recarga la central e inténtalo otra vez.' }); return null; }
  return session;
}
function sameOrigin(request) {
  const origin = request.headers.origin;
  return !origin || origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
}
async function login(request, response) {
  const ip = request.socket.remoteAddress || 'local';
  const recent = (failures.get(ip) || []).filter(time => Date.now() - time < 15 * 60 * 1000);
  if (recent.length >= 8) return json(response, 429, { error:'Demasiados intentos. Espera 15 minutos.' });
  let auth = null;
  try { auth = JSON.parse(await readFile(authFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let username, password;
  try { ({ username, password } = JSON.parse((await body(request, 2048)).toString())); }
  catch { return json(response, 400, { error:'Solicitud inválida.' }); }
  if (typeof username !== 'string' || username.length > 80 || typeof password !== 'string' || password.length > 256) return json(response, 400, { error:'Usuario o contraseña inválidos.' });
  let owner = false;
  if (auth && username === (auth.username || 'isabella-admin')) {
    const params = auth.params?.N === (1 << 14) && auth.params?.r === 8 && auth.params?.p === 5 ? { N:1 << 14, r:8, p:5, maxmem:64 * 1024 * 1024 } : {};
    const candidate = await scrypt(password, Buffer.from(auth.salt, 'hex'), 64, params);
    const expected = Buffer.from(auth.hash, 'hex');
    owner = expected.length === candidate.length && timingSafeEqual(candidate, expected);
  }
  const user = owner ? null : await verifyUser(username, password);
  if (!owner && (!user || !user.permissions.some(permission => permission.startsWith('isabella.')))) {
    recent.push(Date.now()); failures.set(ip, recent);
    return json(response, 401, { error:'Usuario o contraseña incorrectos.' });
  }
  failures.delete(ip);
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  sessions.set(token, { csrf, role:owner ? 'owner' : 'staff', userId:user?.id || null, permissions:owner ? allPermissions : user.permissions, expires: Date.now() + 8 * 60 * 60 * 1000 });
  json(response, 200, { authenticated:true, csrf, role:owner ? 'owner' : 'staff', permissions:owner ? allPermissions : user.permissions }, { 'set-cookie':`isabella_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
}
async function manageUsers(request, response, path) {
  const mutate = request.method !== 'GET';
  const session = await requireAdmin(request, response, mutate);
  if (!session) return;
  if (session.role !== 'owner') return json(response, 403, { error:'Solo el superadministrador puede gestionar usuarios.' });
  if (request.method === 'GET' && path === '/api/central/users') {
    const owner = JSON.parse(await readFile(authFile, 'utf8'));
    return json(response, 200, { owner:{ username:owner.username }, users:(await readUsers()).map(publicUser), permissions:permissionLabels });
  }
  if (request.method !== 'POST' && request.method !== 'PATCH') return json(response, 405, { error:'Método no permitido.' });
  if ((request.method === 'POST' && path !== '/api/central/users') || (request.method === 'PATCH' && !/^\/api\/central\/users\/[0-9a-f-]{36}$/i.test(path))) return json(response, 404, { error:'Ruta de usuario no encontrada.' });
  let input;
  try { input = JSON.parse((await body(request, 4096)).toString()); }
  catch { return json(response, 400, { error:'Datos inválidos.' }); }
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const permissions = input.permissions;
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || name.length < 2 || name.length > 80 || (input.active !== undefined && typeof input.active !== 'boolean') || !Array.isArray(permissions) || !permissions.length || permissions.some(value => !allPermissions.includes(value)) || new Set(permissions).size !== permissions.length) {
    return json(response, 400, { error:'Revisa el nombre, usuario y al menos una vista permitida.' });
  }
  const ownerAuth = JSON.parse(await readFile(authFile, 'utf8'));
  if (username.toLowerCase() === ownerAuth.username.toLowerCase()) return json(response, 409, { error:'Este usuario está reservado para la cuenta propietaria.' });
  let secret = null;
  if (request.method === 'POST' || input.password) {
    try { secret = await hashPassword(input.password); }
    catch (error) { return json(response, 400, { error:error.message }); }
  }
  try {
    const saved = await queueUserUpdate(users => {
      const existing = request.method === 'PATCH' ? users.find(user => user.id === path.slice('/api/central/users/'.length)) : null;
      if (request.method === 'PATCH' && !existing) { const error = new Error('Usuario no encontrado.'); error.status = 404; throw error; }
      if (users.some(user => user.id !== existing?.id && user.username.toLowerCase() === username.toLowerCase())) { const error = new Error('Ese usuario ya existe.'); error.status = 409; throw error; }
      const now = new Date().toISOString();
      const next = existing || { id:randomUUID(), createdAt:now };
      Object.assign(next, { username, name, permissions, active:input.active !== false, updatedAt:now, ...(secret || {}) });
      if (!existing) users.push(next);
      return publicUser(next);
    });
    return json(response, request.method === 'POST' ? 201 : 200, { user:saved });
  } catch (error) { return json(response, error.status || 500, { error:error.status ? error.message : 'No se pudo guardar el usuario.' }); }
}
async function upload(request, response) {
  const type = String(request.headers['content-type'] || '').split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return json(response, 415, { error:'Usa una imagen JPG, PNG o WebP.' });
  const bytes = await body(request);
  let image, metadata;
  try { image = sharp(bytes, { limitInputPixels: 25000000, failOn:'error' }); metadata = await image.metadata(); }
  catch { return json(response, 400, { error:'La imagen no se pudo leer o es demasiado grande.' }); }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || metadata.width < 500 || metadata.height < 500) return json(response, 400, { error:'La imagen debe medir al menos 500 × 500 píxeles.' });
  await mkdir(uploadDir, { recursive:true });
  const id = randomUUID();
  for (const width of [800, 1600]) {
    const output = await sharp(bytes, { limitInputPixels:25000000 }).rotate().resize({ width, height:width, fit:'inside', withoutEnlargement:true }).webp({ quality:82, effort:4 }).toBuffer();
    await writeFile(resolve(uploadDir, `${id}-${width}.webp`), output, { flag:'wx' });
  }
  json(response, 201, { art:{ src:`./assets/uploads/${id}-1600.webp`, srcSmall:`./assets/uploads/${id}-800.webp`, x:50, y:50 }, width:metadata.width, height:metadata.height });
}

async function handle(request, response) {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (!sameOrigin(request)) return json(response, 403, { error:'Origen no permitido.' });
    const path = decodeURIComponent(url.pathname);
    if (path === '/api/menu' && request.method === 'GET') {
      const catalog = await readCatalog();
      return json(response, 200, { version:catalog.version, categories:catalog.categories.filter(category => category.visible !== false).map(category => ({ ...category, items:category.items.filter(item => item.visible !== false) })) });
    }
    if (path === '/api/admin/login' && request.method === 'POST') return login(request, response);
    if (path === '/api/central/users' || path.startsWith('/api/central/users/')) return manageUsers(request, response, path);
    if (path === '/api/admin/session' && request.method === 'GET') {
      const session = await requireAdmin(request, response); if (session) json(response, 200, { authenticated:true, csrf:session.csrf, role:session.role, permissions:session.permissions }); return;
    }
    if (path === '/api/admin/logout' && request.method === 'POST') {
      const session = await requireAdmin(request, response, true); if (!session) return;
      sessions.delete(session.token);
      return json(response, 200, { ok:true }, { 'set-cookie':'isabella_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (path === '/api/admin/menu' && request.method === 'GET') {
      const session = await requireAdmin(request, response); if (!session) return;
      if (session.role !== 'owner' && !session.permissions.some(permission => permission.startsWith('isabella.'))) return json(response, 403, { error:'Sin acceso a la carta de Isabella’s.' });
      return json(response, 200, await readCatalog());
    }
    if (path === '/api/admin/menu' && request.method === 'PUT') {
      const session = await requireAdmin(request, response, true); if (!session) return;
      let payload;
      try { payload = JSON.parse((await body(request, 2 * 1024 * 1024)).toString()); }
      catch { return json(response, 400, { error:'Datos inválidos.' }); }
      if (!Number.isInteger(payload.version) || !Array.isArray(payload.categories)) return json(response, 400, { error:'Carta inválida.' });
      if (session.role !== 'owner') {
        const current = await readCatalog();
        const categoryView = categories => categories.map(({ items, ...category }) => category);
        const itemView = categories => categories.flatMap(category => category.items).sort((a,b) => a.id.localeCompare(b.id));
        if (!session.permissions.includes('isabella.products')) {
          if (JSON.stringify(itemView(payload.categories)) !== JSON.stringify(itemView(current.categories))) return json(response, 403, { error:'Sin permiso para modificar productos.' });
          const nextById = new Map(payload.categories.map(category => [category.id, category]));
          for (const category of current.categories) {
            const retained = nextById.get(category.id);
            if (!retained) continue;
            const originalIds = category.items.map(item => item.id);
            const originalIdSet = new Set(originalIds);
            const keptIds = retained.items.filter(item => originalIdSet.has(item.id)).map(item => item.id);
            if (JSON.stringify(keptIds) !== JSON.stringify(originalIds)) return json(response, 403, { error:'Sin permiso para mover o reordenar productos de una categoría vigente.' });
          }
        }
        if (!session.permissions.includes('isabella.categories') && JSON.stringify(categoryView(payload.categories)) !== JSON.stringify(categoryView(current.categories))) return json(response, 403, { error:'Sin permiso para modificar categorías e imágenes.' });
      }
      const result = await saveCatalog(payload, payload.version);
      if (result.conflict) return json(response, 409, { error:'La carta cambió en otra sesión. Recarga antes de guardar.' });
      if (result.error) return json(response, 400, { error:result.error });
      return json(response, 200, result.saved);
    }
    if (path === '/api/admin/upload' && request.method === 'POST') {
      if (!await requireAdmin(request, response, true, 'isabella.categories')) return;
      return upload(request, response);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error:'Método no permitido.' });
    if (path === '/' || path === '/index.html') {
      response.writeHead(302, headers({ location:`/design-lab/journal.html${url.search}`, 'cache-control':'no-store' }));
      response.end(); return;
    }
    if (path === '/central/usuarios/' || path === '/central/usuarios/index.html') {
      response.writeHead(303, headers({ location:'/central/', 'cache-control':'no-store' })); response.end(); return;
    }
    if (path === '/admin/personal/' || path.startsWith('/admin/personal/')) {
      const session = await liveSession(request);
      if (!session) { response.writeHead(303, headers({ location:'/admin/', 'cache-control':'no-store' })); response.end(); return; }
      if (session.role !== 'owner') return json(response, 403, { error:'Solo el superadministrador puede abrir esta sección.' });
    }
    if ((path === '/central/isabella/' || path === '/central/isabella/index.html') && !(await liveSession(request))?.permissions.some(permission => permission.startsWith('isabella.'))) {
      response.writeHead(303, headers({ location:'/admin/', 'cache-control':'no-store' })); response.end(); return;
    }
    if ((path === '/central/boccantina/' || path === '/central/boccantina/index.html')) {
      response.writeHead(303, headers({ location:`http://127.0.0.1:${Number(process.env.BOCCANTINA_V2_PORT) || 4175}/admin/login/`, 'cache-control':'no-store' })); response.end(); return;
    }
    const directoryPath = `${path}/`;
    if (directoryPages.has(directoryPath)) { response.writeHead(308, headers({ location:directoryPath })); response.end(); return; }
    const target = resolve(root, `.${path === '/' ? '/index.html' : directoryPages.get(path) || path}`);
    if (!target.startsWith(`${root}${sep}`) || !mime[extname(target).toLowerCase()] || !(await stat(target)).isFile()) return json(response, 404, { error:'No encontrado.' });
    const file = await readFile(target);
    response.writeHead(200, headers({ 'content-type':mime[extname(target).toLowerCase()], 'cache-control':extname(target).toLowerCase() === '.webp' ? 'public, max-age=3600' : 'no-store' }));
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch (error) {
    if (error.code === 'ENOENT') return json(response, 404, { error:'No encontrado.' });
    console.error(error);
    json(response, error.status || 500, { error:error.status ? error.message : 'No se pudo completar la operación.' });
  }
}

await readCatalog();
const server = createServer(handle);
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && !explicitPort && port < 4184) { port++; server.listen(port, '127.0.0.1'); }
  else { console.error(error); process.exitCode = 1; }
});
server.listen(port, '127.0.0.1', () => console.log(`Isabella's menú: http://127.0.0.1:${port}/ · Restaurantes: http://127.0.0.1:${port}/central/ · Admin: http://127.0.0.1:${port}/admin/`));
