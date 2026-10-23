import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { dataDir } from './menu-store.mjs';

const scrypt = promisify(scryptCallback);
const params = { N: 1 << 14, r: 8, p: 5, maxmem: 64 * 1024 * 1024 };
export const userFile = resolve(process.env.ISABELLA_USERS_FILE || resolve(dataDir, 'central-users.json'));
export const permissionLabels = Object.freeze({
  'isabella.products': 'Isabella’s · Productos',
  'isabella.categories': 'Isabella’s · Categorías e imágenes',
});
export const allPermissions = Object.keys(permissionLabels);
let writeQueue = Promise.resolve();

export async function readUsers() {
  try {
    const data = JSON.parse(await readFile(userFile, 'utf8'));
    return Array.isArray(data.users) ? data.users : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export function publicUser(user) {
  return { id:user.id, username:user.username, name:user.name, active:user.active, permissions:user.permissions, createdAt:user.createdAt, updatedAt:user.updatedAt };
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) throw new Error('La contraseña debe tener entre 8 y 256 caracteres.');
  const salt = randomBytes(32).toString('hex');
  const hash = (await scrypt(password, Buffer.from(salt, 'hex'), 64, params)).toString('hex');
  return { salt, hash };
}

export async function verifyUser(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  const users = await readUsers();
  const user = users.find(item => item.active && item.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !/^[a-f0-9]{64}$/.test(user.salt || '') || !/^[a-f0-9]{128}$/.test(user.hash || '')) return null;
  const candidate = await scrypt(password, Buffer.from(user.salt, 'hex'), 64, params);
  if (!timingSafeEqual(candidate, Buffer.from(user.hash, 'hex'))) return null;
  return user;
}

export function queueUserUpdate(update) {
  const result = writeQueue.then(async () => {
    const users = await readUsers();
    const value = await update(users);
    await mkdir(dirname(userFile), { recursive:true });
    const temporary = `${userFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ version:1, users }, null, 2)}\n`, { mode:0o600 });
    await rename(temporary, userFile);
    return value;
  });
  writeQueue = result.catch(() => {});
  return result;
}
