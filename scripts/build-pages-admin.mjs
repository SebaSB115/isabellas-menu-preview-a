import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'preview-a/admin');
const target = resolve(repo, 'docs/admin');

function replaceOnce(input, before, after) {
  if (!input.includes(before)) throw new Error(`No se encontró el bloque esperado: ${before.slice(0, 70)}`);
  return input.replace(before, after);
}

function replaceBetween(input, start, end, replacement) {
  const from = input.indexOf(start);
  const to = input.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`No se encontró el rango: ${start}`);
  return input.slice(0, from) + replacement + input.slice(to);
}

let html = (await readFile(resolve(source, 'index.html'), 'utf8')).replace(/\r\n/g, '\n');
html = replaceOnce(html, `<title>Central de carta · Isabella's</title>`, `<title>Demo de la central · Isabella's</title>`);
html = replaceOnce(html, '<h1 class="entry-kicker">ACCESO PRIVADO</h1>', '<h1 class="entry-kicker">ACCESO DE DEMOSTRACIÓN</h1>');
html = replaceOnce(html, '<p class="entry-foot">Vista previa local · Los cambios no se publican en producción.</p>', '<p class="entry-foot">Demo pública sin autenticación real. Usuario: <strong>demo-isabella</strong> · Contraseña: <strong>vista2026</strong>. Los datos quedan en este navegador.</p>');
html = replaceOnce(html, '<span class="online-dot"></span> Vista previa local<br /><small>Los cambios se guardan en este equipo.</small>', '<span class="online-dot"></span> Demo pública<br /><small>Los cambios solo viven en este navegador.</small>');
html = replaceOnce(html, '<button id="logout" type="button">Salir</button>', '<button id="reset-demo" type="button">Restablecer demo</button><button id="logout" type="button">Salir</button>');
html = html.replace(/\s*<a id="staff-link"[^>]*>.*?<\/a>/, '');
html = replaceOnce(html, '      <main id="main" tabindex="-1">', '      <div class="demo-banner" role="note"><strong>Demostración de la central</strong><span>Puedes probar la edición y ver los cambios en Isabella’s Journal desde este mismo navegador. No se comparten con otros dispositivos ni modifican la web oficial. La traducción automática y el acceso privado requieren la integración final.</span></div>\n      <main id="main" tabindex="-1">');
html = replaceOnce(html, 'Carta 2026 · control editorial', 'Carta 2026 · demostración editorial');

let css = (await readFile(resolve(source, 'style.css'), 'utf8')).replace(/\r\n/g, '\n');
css += '\n.demo-banner { display:grid; gap:.2rem; padding:.75rem clamp(1rem,3vw,2.5rem); border-bottom:1px solid #dec8a9; background:#f9ead0; color:#4a332b; font-size:.81rem; }\n.demo-banner strong { font-size:.86rem; }\n';

let app = (await readFile(resolve(source, 'app.js'), 'utf8')).replace(/\r\n/g, '\n');
app = `import { api, resetDemo } from './demo-store.js';\n` + app;
app = replaceBetween(app, 'async function api(path, options = {}) {', 'function notice(', '');
app = replaceOnce(app, "let csrf = '';\n", '');
app = replaceBetween(app, 'function showLogin()', 'function guard()', "function showLogin() { $('login-screen').hidden = false; $('app-shell').hidden = true; document.querySelector('.skip-link').href = '#acceso'; }\nfunction showApp() { permissions = ['isabella.products', 'isabella.categories']; $('login-screen').hidden = true; $('app-shell').hidden = false; document.querySelector('.skip-link').href = '#main'; render(); }\n");
app = replaceBetween(app, "$('login-form').addEventListener('submit'", "document.querySelector('.main-nav')", `const demoAccessKey = 'isabella.github-pages.demo-access.v1';
const demoUsername = 'demo-isabella';
const demoPassword = 'vista2026';
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('login-message').textContent = '';
  if ($('username').value.trim().toLowerCase() !== demoUsername || $('password').value !== demoPassword) {
    $('login-message').textContent = 'Usuario o contraseña de demostración incorrectos.';
    $('password').focus(); return;
  }
  try {
    catalog = await api('/api/admin/menu');
    selectedCategory = catalog.categories[0]?.id || null;
    selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null;
    sessionStorage.setItem(demoAccessKey, '1');
    $('password').value = ''; showApp();
  } catch (error) { $('login-message').textContent = error.message; }
});
$('toggle-password').addEventListener('click', () => {
  const visible = $('password').type === 'password';
  $('password').type = visible ? 'text' : 'password';
  $('toggle-password').textContent = visible ? 'Ocultar' : 'Mostrar';
  $('toggle-password').setAttribute('aria-pressed', String(visible));
});
$('logout').addEventListener('click', () => {
  if (!guard()) return;
  sessionStorage.removeItem(demoAccessKey); catalog = null; dirty = false; showLogin(); $('username').focus();
});
$('reset-demo').addEventListener('click', () => {
  if (!guard() || !confirm('¿Restablecer todos los cambios de esta demostración en este navegador?')) return;
  resetDemo(); location.reload();
});
`);
const bootstrapStart = app.indexOf("try {\n  const session = await api('/api/admin/session')");
if (bootstrapStart < 0) throw new Error('No se encontró el arranque del administrador local.');
app = app.slice(0, bootstrapStart) + "if (sessionStorage.getItem(demoAccessKey) === '1') {\n  try {\n    catalog = await api('/api/admin/menu');\n    selectedCategory = catalog.categories[0]?.id || null;\n    selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null;\n    showApp();\n  } catch { showLogin(); }\n} else showLogin();\n";
app = replaceOnce(app, 'Los otros cuatro idiomas se generarán al guardar el producto.', 'En esta demo, los otros idiomas no se generan al crear un producto.');
app = replaceOnce(app, 'Textos guardados para la carta. Se actualizan al guardar cambios en español.', 'Consulta de los textos iniciales. Los cambios de esta demo se guardan solo en español.');
app = replaceOnce(app, 'Guardando…', 'Guardando la demo…');
app = replaceOnce(app, "'Producto creado y visible en la carta.'", "'Producto creado en esta demo.'");
app = replaceOnce(app, "'Producto actualizado.'", "'Producto actualizado en esta demo.'");
app = replaceOnce(app, "'Categoría creada.'", "'Categoría creada en esta demo.'");
app = replaceOnce(app, "'Categoría y fondo actualizados.'", "'Categoría y fondo actualizados en esta demo.'");

await mkdir(target, { recursive: true });
await Promise.all([
  writeFile(resolve(target, 'index.html'), html),
  writeFile(resolve(target, 'style.css'), css),
  writeFile(resolve(target, 'app.js'), app),
]);
console.log('Demo pública de la central generada en docs/admin/.');
