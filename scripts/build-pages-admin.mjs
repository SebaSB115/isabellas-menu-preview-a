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
html = replaceBetween(html, '  <section class="login-screen admin-entry entry-page"', '  <div class="app-shell"', '');
html = replaceOnce(html, `<title>Central de carta · Isabella's</title>`, `<title>Demo de la central · Isabella's</title>`);
html = replaceOnce(html, '<div class="app-shell" id="app-shell" hidden>', '<div class="app-shell" id="app-shell">');
html = replaceOnce(html, '<span class="online-dot"></span> Vista previa local<br /><small>Los cambios se guardan en este equipo.</small>', '<span class="online-dot"></span> Demo pública<br /><small>Los cambios solo viven en este navegador.</small>');
html = replaceOnce(html, '<button id="logout" type="button">Salir</button>', '<button id="reset-demo" type="button">Restablecer demo</button>');
html = html.replace(/\s*<a id="staff-link"[^>]*>.*?<\/a>/, '');
html = replaceOnce(html, '      <main id="main" tabindex="-1">', '      <div class="demo-banner" role="note"><strong>Demostración de la central</strong><span>Puedes probar la edición y ver los cambios en Isabella’s Journal desde este mismo navegador. No se comparten con otros dispositivos ni modifican la web oficial. La traducción automática y el acceso privado requieren la integración final.</span></div>\n      <main id="main" tabindex="-1">');
html = replaceOnce(html, 'Carta 2026 · control editorial', 'Carta 2026 · demostración editorial');

let css = (await readFile(resolve(source, 'style.css'), 'utf8')).replace(/\r\n/g, '\n');
css += '\n.demo-banner { display:grid; gap:.2rem; padding:.75rem clamp(1rem,3vw,2.5rem); border-bottom:1px solid #dec8a9; background:#f9ead0; color:#4a332b; font-size:.81rem; }\n.demo-banner strong { font-size:.86rem; }\n';

let app = (await readFile(resolve(source, 'app.js'), 'utf8')).replace(/\r\n/g, '\n');
app = `import { api, resetDemo } from './demo-store.js';\n` + app;
app = replaceBetween(app, 'async function api(path, options = {}) {', 'function notice(', '');
app = replaceOnce(app, "let csrf = '';\n", '');
app = replaceBetween(app, 'function showLogin()', 'function guard()', "function showApp() { $('app-shell').hidden = false; render(); }\n");
app = replaceBetween(app, "$('login-form').addEventListener('submit'", "document.querySelector('.main-nav')", "$('reset-demo').addEventListener('click', () => {\n  if (!guard() || !confirm('¿Restablecer todos los cambios de esta demostración en este navegador?')) return;\n  resetDemo(); location.reload();\n});\n");
const bootstrapStart = app.indexOf("try {\n  const session = await api('/api/admin/session')");
if (bootstrapStart < 0) throw new Error('No se encontró el arranque del administrador local.');
app = app.slice(0, bootstrapStart) + "try {\n  catalog = await api('/api/admin/menu');\n  selectedCategory = catalog.categories[0]?.id || null;\n  selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null;\n  showApp();\n} catch (error) { notice(error.message, true); }\n";
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
