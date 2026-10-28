import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { dataDir } from './preview-config.mjs';

const scrypt = promisify(scryptCallback);
const params = { N: 1 << 14, r: 8, p: 5 };
const file = resolve(dataDir, 'admin-auth.json');
const username = process.env.ISABELLA_ADMIN_USER || 'isabella-admin';
if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) { console.error('El usuario debe tener entre 3 y 80 caracteres alfanuméricos, punto, guion o guion bajo.'); process.exit(1); }
if (!process.stdin.isTTY) { console.error('Ejecuta este comando en una terminal interactiva.'); process.exit(1); }

function secretPrompt(label) {
  return new Promise(resolvePrompt => {
    process.stdout.write(label);
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const done = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); process.stdin.removeListener('data', onData); resolvePrompt(value); };
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') return done();
        if (char === '\u0003') { process.stdin.setRawMode(false); process.exit(130); }
        if (char === '\u007f') value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

try {
  await readFile(file);
  console.log('Ya existe una cuenta administradora local. Este comando cambiará su contraseña.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const password = await secretPrompt('Nueva contraseña (mínimo 11 caracteres): ');
const confirm = await secretPrompt('Repetir contraseña: ');
if (password.length < 11 || password.length > 256 || password !== confirm) { console.error('La contraseña debe coincidir y tener entre 11 y 256 caracteres.'); process.exit(1); }
const salt = randomBytes(32).toString('hex');
const hash = (await scrypt(password, Buffer.from(salt, 'hex'), 64, { ...params, maxmem:64 * 1024 * 1024 })).toString('hex');
await mkdir(dirname(file), { recursive: true });
await writeFile(file, JSON.stringify({ username, algorithm: 'scrypt', params, salt, hash, changedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
console.log(`Acceso de Isabella's configurado para el usuario ${username}.`);
