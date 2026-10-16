import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = resolve(root, '.venv-translation', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const worker = resolve(root, 'scripts/translate_argos.py');

export async function translateSpanish(values) {
  if (!values.length) return [];
  return new Promise((resolveResult, reject) => {
    const child = spawn(python, [worker], { cwd:root, stdio:['pipe','pipe','pipe'], windowsHide:true, env:{ ...process.env, PYTHONIOENCODING:'utf-8' } });
    let stdout = '', stderr = '';
    const timeout = setTimeout(() => child.kill(), 180000);
    child.on('error', error => { clearTimeout(timeout); reject(translationError(error.message)); });
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 1000000) child.kill(); });
    child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > 20000) child.kill(); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) return reject(translationError(stderr.trim() || 'El proceso de traducción terminó sin respuesta.'));
      try {
        const output = JSON.parse(stdout);
        if (!Array.isArray(output) || output.length !== values.length || output.some(item => !['en','de','ar','he'].every(code => typeof item?.[code] === 'string'))) throw new Error('Respuesta incompleta');
        resolveResult(output);
      } catch (error) { reject(translationError(error.message)); }
    });
    child.stdin.end(JSON.stringify(values));
  });
}

function translationError(detail) {
  const error = new Error(`No se pudo traducir. Ejecuta npm.cmd run translate:setup y vuelve a guardar. ${detail}`);
  error.status = 503;
  return error;
}
