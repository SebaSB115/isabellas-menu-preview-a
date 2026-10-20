import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { readCatalog, saveCatalog, dataDir } from './menu-store.mjs';

const scrypt = promisify(scryptCallback);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(repo, 'preview-a');
const authFile = resolve(dataDir, 'admin-auth.json');
const uploadDir = resolve(root, 'assets/uploads');
const explicitPort = process.env.ISABELLA_PREVIEW_PORT;
let port = Number(explicitPort) || 4174;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webp':'image/webp', '.svg':'image/svg+xml' };
const directoryPages = new Map([
  ['/admin/', '/admin/index.html'],
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
function requireAdmin(request, response, mutate = false) {
  const session = sessionFor(request);
  if (!session) { json(response, 401, { error:'Inicia sesión como administrador.' }); return null; }
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
  let auth;
  try { auth = JSON.parse(await readFile(authFile, 'utf8')); }
  catch { return json(response, 503, { error:'Primero configura la contraseña con npm run admin:setup.' }); }
  let password;
  try { password = JSON.parse((await body(request, 2048)).toString()).password; }
  catch { return json(response, 400, { error:'Solicitud inválida.' }); }
  if (typeof password !== 'string' || password.length > 256) return json(response, 400, { error:'Contraseña inválida.' });
  const candidate = await scrypt(password, Buffer.from(auth.salt, 'hex'), 64);
  const expected = Buffer.from(auth.hash, 'hex');
  if (expected.length !== candidate.length || !timingSafeEqual(candidate, expected)) {
    recent.push(Date.now()); failures.set(ip, recent);
    return json(response, 401, { error:'Contraseña incorrecta.' });
  }
  failures.delete(ip);
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  sessions.set(token, { csrf, expires: Date.now() + 8 * 60 * 60 * 1000 });
  json(response, 200, { authenticated:true, csrf }, { 'set-cookie':`isabella_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
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
    if (path === '/api/admin/session' && request.method === 'GET') {
      const session = requireAdmin(request, response); if (session) json(response, 200, { authenticated:true, csrf:session.csrf }); return;
    }
    if (path === '/api/admin/logout' && request.method === 'POST') {
      const session = requireAdmin(request, response, true); if (!session) return;
      sessions.delete(session.token);
      return json(response, 200, { ok:true }, { 'set-cookie':'isabella_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    }
    if (path === '/api/admin/menu' && request.method === 'GET') {
      if (!requireAdmin(request, response)) return;
      return json(response, 200, await readCatalog());
    }
    if (path === '/api/admin/menu' && request.method === 'PUT') {
      if (!requireAdmin(request, response, true)) return;
      let payload;
      try { payload = JSON.parse((await body(request, 2 * 1024 * 1024)).toString()); }
      catch { return json(response, 400, { error:'Datos inválidos.' }); }
      if (!Number.isInteger(payload.version)) return json(response, 400, { error:'Versión inválida.' });
      const result = await saveCatalog(payload, payload.version);
      if (result.conflict) return json(response, 409, { error:'La carta cambió en otra sesión. Recarga antes de guardar.' });
      if (result.error) return json(response, 400, { error:result.error });
      return json(response, 200, result.saved);
    }
    if (path === '/api/admin/upload' && request.method === 'POST') {
      if (!requireAdmin(request, response, true)) return;
      return upload(request, response);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error:'Método no permitido.' });
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
