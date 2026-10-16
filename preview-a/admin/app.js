const $ = id => document.getElementById(id);
const languages = [['es','Español'],['en','English'],['de','Deutsch'],['ar','العربية · RTL'],['he','עברית · RTL']];
const originalPages = [['1-PRE.webp','Ensaladas y sopas'],['2-PRE.webp','Entradas'],['7-PRE.webp','Focaccia y strombolis'],['ALL-4-D.webp','Pastas y risotto'],['4-PRE.webp','Pastas adicionales'],['ALL-4-C.webp','Carnes'],['ALL-4-A.webp','Cocteles clásicos'],['ALL-4-B.webp','Café']];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const priceText = amount => amount == null ? 'Sin precio' : `₡${new Intl.NumberFormat('en-US').format(amount)}`;
const blankLocales = () => Object.fromEntries(languages.map(([code]) => [code,'']));
const assetUrl = path => path?.startsWith('./') ? `../${path.slice(2)}` : path;
const originalArt = source => `../assets/menu-art/${source.replace(/\.webp$/, '-art.webp')}`;
let csrf = '';
let catalog = null;
let tab = 'products';
let selectedCategory = null;
let selectedProduct = null;
let draft = null;
let pendingArt;
let dirty = false;
let noticeTimer;

async function api(path, options = {}) {
  const response = await fetch(path, { credentials:'same-origin', cache:'no-store', ...options, headers:{ ...(options.body instanceof ArrayBuffer ? {} : { 'content-type':'application/json' }), ...(csrf ? { 'x-csrf-token':csrf } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}
function notice(message, error = false) {
  clearTimeout(noticeTimer);
  $('notice').textContent = message;
  $('notice').classList.toggle('is-error', error);
  $('notice').hidden = false;
  if (!error) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5500);
}
function showLogin() { $('login-screen').hidden = false; $('app-shell').hidden = true; }
function showApp() { $('login-screen').hidden = true; $('app-shell').hidden = false; render(); }
function guard() { return !dirty || confirm('Hay cambios sin guardar. ¿Descartarlos?'); }
function currentCategory() { return catalog.categories.find(category => category.id === selectedCategory); }
function currentProduct() { return catalog.categories.flatMap(category => category.items).find(item => item.id === selectedProduct); }
function countProducts() { return catalog.categories.reduce((count, category) => count + category.items.length, 0); }

function render() {
  if (!catalog) return;
  const isProduct = tab === 'products';
  $('breadcrumb-current').textContent = isProduct ? 'Productos' : 'Categorías y fondos';
  $('page-title').textContent = isProduct ? 'Productos' : 'Categorías y fondos';
  $('page-description').textContent = isProduct ? 'Escribe nombre y descripción en español; al guardar se traducen los otros idiomas.' : 'Organiza la carta, edita el nombre en español y elige el arte de cada página.';
  $('new-button').textContent = isProduct ? '+ Nuevo producto' : '+ Nueva categoría';
  $('search').placeholder = isProduct ? 'Buscar productos' : 'Buscar categorías';
  $('product-count').textContent = countProducts();
  $('category-count').textContent = catalog.categories.length;
  document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.tab === tab));
  renderList(); renderEditor();
}
function renderList() {
  const search = $('search').value.trim().toLocaleLowerCase();
  const list = $('catalog-list');
  if (tab === 'categories') {
    const visible = catalog.categories.filter(category => category.title.es.toLocaleLowerCase().includes(search));
    $('list-count').textContent = `${visible.length} categorías`;
    list.innerHTML = visible.length ? visible.map(category => `<button class="catalog-row ${category.id === selectedCategory ? 'is-selected' : ''}" type="button" data-category="${escapeHtml(category.id)}"><span><strong>${escapeHtml(category.title.es)}</strong><small>${category.items.length} productos · ${category.art ? 'Fondo personalizado' : 'Arte original'}</small></span><span class="status">${category.visible === false ? 'Oculta' : 'Visible'}</span></button>`).join('') : '<p class="catalog-empty">No hay categorías con ese nombre.</p>';
    return;
  }
  let count = 0;
  list.innerHTML = catalog.categories.map(category => {
    const matches = category.items.filter(item => `${item.name.es} ${item.description.es} ${category.title.es}`.toLocaleLowerCase().includes(search));
    count += matches.length;
    if (!matches.length) return '';
    return `<p class="catalog-section-title">${escapeHtml(category.title.es)} · ${matches.length}</p>${matches.map(item => `<button class="catalog-row ${item.id === selectedProduct ? 'is-selected' : ''}" type="button" data-product="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.name.es)}</strong><small>${item.visible === false ? 'Oculto' : item.options?.length ? `${item.options.length} variantes` : 'Visible'}</small></span><span class="price">${escapeHtml(item.options?.length ? 'Variantes' : priceText(item.price))}</span></button>`).join('')}`;
  }).join('') || '<p class="catalog-empty">No hay productos con esa búsqueda. Usa «Nuevo producto» para agregar uno.</p>';
  $('list-count').textContent = `${count} productos`;
}
function field(label, name, value, options = {}) {
  const { type = 'text', required = false, full = false, min = '', max = '', placeholder = '' } = options;
  const attrs = `${required ? ' required' : ''}${min !== '' ? ` min="${min}"` : ''}${max !== '' ? ` ${type === 'number' ? 'max' : 'maxlength'}="${max}"` : ''}${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}`;
  return `<label class="field ${full ? 'field--full' : ''}"><span>${escapeHtml(label)}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea name="${name}"${attrs}>${escapeHtml(value)}</textarea>` : `<input name="${name}" type="${type}" value="${escapeHtml(value)}"${attrs} />`}</label>`;
}
function spanishField(value, name, kind = 'name') {
  return `${field(kind === 'name' ? 'Nombre en español' : 'Descripción en español', `${name}-es`, value?.es || '', { required:true, type:kind === 'description' ? 'textarea' : 'text', max:kind === 'description' ? 1000 : 150 })}<p class="helper">Inglés, alemán, árabe y hebreo se generan automáticamente al guardar.</p>`;
}
function optionMarkup(option, index) {
  return `<div class="option-card" data-option><header><strong>Variante ${index + 1}</strong><button class="danger-button" type="button" data-remove-option>Quitar</button></header><div class="field-grid">${field('Precio en ₡', 'option-price', option?.price ?? '', { type:'number', min:0, max:10000000, required:true })}${field('Nombre en español', 'option-es', option?.label?.es || '', { required:true })}</div></div>`;
}
function renderProductEditor() {
  const item = draft?.type === 'product' ? draft.value : currentProduct();
  const creating = draft?.type === 'product';
  if (!item) { $('editor-panel').innerHTML = '<div class="catalog-empty"><h2>Selecciona un producto</h2><p>Elige un plato de la lista o crea uno nuevo.</p></div>'; return; }
  const category = creating ? selectedCategory : catalog.categories.find(group => group.items.some(entry => entry.id === item.id))?.id;
  $('editor-panel').innerHTML = `<form id="edit-form" data-kind="product"><div class="editor-heading"><div><h2>${creating ? 'Nuevo producto' : escapeHtml(item.name.es)}</h2><p>${creating ? 'Añade el plato a una categoría.' : `ID: ${escapeHtml(item.id)}`}</p></div><span class="status-pill">${item.visible === false ? 'Oculto' : 'Visible'}</span></div>
    <div class="form-section"><h3>Datos principales</h3><div class="field-grid"><label class="field"><span>Categoría *</span><select name="category" required>${catalog.categories.map(group => `<option value="${escapeHtml(group.id)}" ${group.id === category ? 'selected' : ''}>${escapeHtml(group.title.es)}</option>`).join('')}</select></label>${field('Precio en ₡', 'price', item.price ?? '', { type:'number', min:0, max:10000000, placeholder:'Vacío = consultar precio' })}<label class="toggle-field field--full"><input type="checkbox" name="visible" ${item.visible === false ? '' : 'checked'} /><span>Mostrar en la carta pública</span></label></div></div>
    <div class="form-section"><h3>Nombre del producto</h3>${spanishField(item.name, 'name')}</div>
    <div class="form-section"><h3>Descripción</h3>${spanishField(item.description, 'description', 'description')}</div>
    <div class="form-section"><h3>Variantes con precio propio</h3><p>Úsalas cuando un plato tenga opciones como pollo y carne. El precio principal puede quedar vacío.</p><div id="options-list">${(item.options || []).map(optionMarkup).join('')}</div><button class="text-button" type="button" id="add-option">+ Añadir variante</button></div>
    <div class="form-section"><h3>Adicional</h3><label class="toggle-field"><input type="checkbox" id="has-addon" ${item.addon ? 'checked' : ''} /><span>Este plato ofrece un adicional</span></label><div id="addon-fields" ${item.addon ? '' : 'hidden'}><div class="field-grid">${field('Precio del adicional en ₡', 'addon-price', item.addon?.price ?? '', { type:'number', min:0, max:10000000 })}${field('Nombre en español', 'addon-es', item.addon?.label?.es || '')}</div></div></div>
    <div class="form-actions">${creating ? '<button class="text-button" type="button" data-cancel>Cancelar</button>' : '<button class="danger-button" type="button" data-delete>Eliminar producto</button>'}<button class="primary-button" type="submit">${creating ? 'Crear producto' : 'Guardar producto'}</button></div></form>`;
}
function imagePreview(category, art) {
  const url = art?.src ? assetUrl(art.src) : originalArt(category.source);
  const position = `${art?.x ?? 50}% ${art?.y ?? 50}%`;
  return `<div class="image-preview"><div class="image-frame desktop"><figure><img class="preview-image" src="${escapeHtml(url)}" style="object-position:${position}" alt="Vista previa del fondo vertical" /><figcaption>Página en escritorio</figcaption></figure></div><div class="image-frame mobile"><figure><img class="preview-image" src="${escapeHtml(url)}" style="object-position:${position}" alt="Vista previa del fondo en móvil" /><figcaption>Recorte en móvil</figcaption></figure></div></div>`;
}
function renderCategoryEditor() {
  const category = draft?.type === 'category' ? draft.value : currentCategory();
  const creating = draft?.type === 'category';
  if (!category) { $('editor-panel').innerHTML = '<div class="catalog-empty"><h2>Selecciona una categoría</h2><p>Elige una categoría o crea una nueva.</p></div>'; return; }
  const art = pendingArt === undefined ? category.art : pendingArt;
  $('editor-panel').innerHTML = `<form id="edit-form" data-kind="category"><div class="editor-heading"><div><h2>${creating ? 'Nueva categoría' : escapeHtml(category.title.es)}</h2><p>${creating ? 'Organiza los productos del menú.' : `${category.items.length} productos en esta categoría`}</p></div><span class="status-pill">${category.visible === false ? 'Oculta' : 'Visible'}</span></div>
    <div class="form-section"><h3>Nombre de la categoría</h3>${spanishField(category.title, 'title')}</div>
    <div class="form-section"><h3>Orden y visibilidad</h3><div class="field-grid"><label class="field"><span>Referencia original</span><select name="source">${originalPages.map(([file,label]) => `<option value="${file}" ${category.source === file ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label><label class="toggle-field"><input type="checkbox" name="visible" ${category.visible === false ? '' : 'checked'} /><span>Mostrar categoría en la carta</span></label></div><p class="helper">Para cambiar el orden de las categorías usa los botones de posición de abajo.</p><div class="image-upload"><button class="text-button" type="button" data-move="-1">↑ Subir</button><button class="text-button" type="button" data-move="1">↓ Bajar</button></div></div>
    <div class="form-section"><h3>Fondo de la página izquierda</h3><p>Sube un arte sin nombres ni precios. La imagen se adapta sola al tamaño de la página; ajusta el punto de enfoque si el motivo principal queda cortado.</p>${imagePreview(category, art)}<div class="image-upload"><label class="field"><span>Imagen JPG, PNG o WebP · máximo 10 MB</span><input type="file" id="art-file" accept="image/jpeg,image/png,image/webp" /></label><button class="text-button" type="button" id="remove-art" ${art ? '' : 'hidden'}>Usar arte original</button></div><div class="range-row"><label for="focus-x">Horizontal</label><input id="focus-x" type="range" min="0" max="100" value="${art?.x ?? 50}" /><output id="focus-x-value">${art?.x ?? 50}%</output></div><div class="range-row"><label for="focus-y">Vertical</label><input id="focus-y" type="range" min="0" max="100" value="${art?.y ?? 50}" /><output id="focus-y-value">${art?.y ?? 50}%</output></div><p class="helper">Recomendado: al menos 1600 × 1200 px. El sistema genera tamaños WebP para escritorio y móvil.</p></div>
    <div class="form-actions">${creating ? '<button class="text-button" type="button" data-cancel>Cancelar</button>' : '<button class="danger-button" type="button" data-delete>Eliminar categoría</button>'}<button class="primary-button" type="submit">${creating ? 'Crear categoría' : 'Guardar categoría'}</button></div></form>`;
}
function renderEditor() { if (tab === 'products') renderProductEditor(); else renderCategoryEditor(); }
function readSpanish(form, prefix, previous) { return { ...blankLocales(), ...previous, es:String(form.elements[`${prefix}-es`]?.value || '').trim() }; }
function readPrice(value) { return value === '' ? null : Number(value); }
async function commit(next, message) {
  const saved = await api('/api/admin/menu', { method:'PUT', body:JSON.stringify({ version:catalog.version, categories:next }) });
  catalog = saved; dirty = false; draft = null; pendingArt = undefined; notice(message); render();
}
async function saveProduct(form) {
  const old = draft?.type === 'product' ? draft.value : currentProduct();
  const categoryId = form.elements.category.value;
  const name = readSpanish(form,'name',old.name);
  const description = readSpanish(form,'description',old.description);
  if (!name.es || !description.es) return notice('Escribe el nombre y la descripción en español.', true);
  const options = [...form.querySelectorAll('[data-option]')].map((card, index) => ({ price:readPrice(card.querySelector('[name="option-price"]').value), label:{ ...blankLocales(), ...old.options?.[index]?.label, es:card.querySelector('[name="option-es"]').value.trim() } }));
  if (options.some(option => option.price === null || !option.label.es)) return notice('Cada variante necesita nombre en español y precio.', true);
  const nextItem = { ...old, name, description, price:readPrice(form.elements.price.value), visible:form.elements.visible.checked };
  if (options.length) nextItem.options = options; else delete nextItem.options;
  if ($('has-addon').checked) {
    const addonPrice = readPrice(form.elements['addon-price'].value);
    const addonLabel = readSpanish(form, 'addon', old.addon?.label);
    if (addonPrice === null || !addonLabel.es) return notice('El adicional necesita nombre en español y precio.', true);
    nextItem.addon = { price:addonPrice, label:addonLabel };
  } else delete nextItem.addon;
  const next = structuredClone(catalog.categories);
  const previousCategory = next.find(category => category.items.some(item => item.id === nextItem.id));
  const previousIndex = previousCategory?.items.findIndex(item => item.id === nextItem.id) ?? -1;
  next.forEach(category => { category.items = category.items.filter(item => item.id !== nextItem.id); });
  const target = next.find(category => category.id === categoryId);
  if (!target) return notice('Elige una categoría válida.', true);
  if (draft?.type === 'product' || old.source && catalog.categories.find(category => category.items.some(item => item.id === old.id))?.id !== categoryId) delete nextItem.source;
  if (previousCategory?.id === categoryId && previousIndex >= 0) target.items.splice(previousIndex, 0, nextItem);
  else target.items.push(nextItem);
  await commit(next, draft?.type === 'product' ? 'Producto creado y visible en la carta.' : 'Producto actualizado.');
  selectedProduct = nextItem.id; selectedCategory = categoryId; render();
}
async function saveCategory(form) {
  const old = draft?.type === 'category' ? draft.value : currentCategory();
  const title = readSpanish(form,'title',old.title);
  if (!title.es) return notice('Escribe el nombre de la categoría en español.', true);
  const art = pendingArt === undefined ? old.art : pendingArt;
  const nextCategory = { ...old, title, source:form.elements.source.value, visible:form.elements.visible.checked };
  if (art) nextCategory.art = { ...art, x:Number($('focus-x').value), y:Number($('focus-y').value) };
  else delete nextCategory.art;
  const next = structuredClone(catalog.categories);
  const index = next.findIndex(category => category.id === nextCategory.id);
  if (index < 0) next.push(nextCategory); else next[index] = nextCategory;
  await commit(next, draft?.type === 'category' ? 'Categoría creada.' : 'Categoría y fondo actualizados.');
  selectedCategory = nextCategory.id; render();
}
async function removeSelected() {
  if (tab === 'products') {
    const item = currentProduct();
    if (!item || !confirm(`¿Eliminar «${item.name.es}» de la carta?`)) return;
    const next = structuredClone(catalog.categories);
    next.forEach(category => { category.items = category.items.filter(entry => entry.id !== item.id); });
    await commit(next, 'Producto eliminado.');
    selectedProduct = next.flatMap(category => category.items)[0]?.id || null; render();
    return;
  }
  const category = currentCategory();
  if (!category) return;
  if (category.items.length) return notice('Mueve o elimina los productos de esta categoría antes de borrarla.', true);
  if (!confirm(`¿Eliminar la categoría «${category.title.es}»?`)) return;
  await commit(catalog.categories.filter(entry => entry.id !== category.id), 'Categoría eliminada.');
  selectedCategory = catalog.categories[0]?.id || null; render();
}
async function moveCategory(direction) {
  const index = catalog.categories.findIndex(category => category.id === selectedCategory);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= catalog.categories.length) return;
  const next = structuredClone(catalog.categories);
  [next[index],next[target]] = [next[target],next[index]];
  await commit(next, 'Orden de categorías actualizado.');
}
function updateArtPreview() {
  const category = draft?.type === 'category' ? draft.value : currentCategory();
  const art = pendingArt === undefined ? category.art : pendingArt;
  const path = art?.src ? assetUrl(art.src) : originalArt($('edit-form').elements.source.value);
  document.querySelectorAll('.preview-image').forEach(image => { image.src = path; image.style.objectPosition = `${$('focus-x').value}% ${$('focus-y').value}%`; });
  $('remove-art').hidden = !art;
  $('focus-x-value').textContent = `${$('focus-x').value}%`;
  $('focus-y-value').textContent = `${$('focus-y').value}%`;
}

$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('login-message').textContent = '';
  const button = event.target.querySelector('button'); button.disabled = true;
  try { const result = await api('/api/admin/login', { method:'POST', body:JSON.stringify({ password:$('password').value }) }); csrf = result.csrf; $('password').value = ''; $('password').type = 'password'; $('toggle-password').textContent = 'Mostrar'; $('toggle-password').setAttribute('aria-pressed','false'); catalog = await api('/api/admin/menu'); selectedCategory = catalog.categories[0]?.id || null; selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null; showApp(); }
  catch (error) { $('login-message').textContent = error.message; }
  finally { button.disabled = false; }
});
$('toggle-password').addEventListener('click', () => {
  const visible = $('password').type === 'password';
  $('password').type = visible ? 'text' : 'password';
  $('toggle-password').textContent = visible ? 'Ocultar' : 'Mostrar';
  $('toggle-password').setAttribute('aria-pressed', String(visible));
});
$('logout').addEventListener('click', async () => { if (!guard()) return; await api('/api/admin/logout', { method:'POST' }).catch(() => {}); csrf = ''; catalog = null; showLogin(); });
document.querySelector('.main-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-tab]'); if (!button || !guard()) return;
  tab = button.dataset.tab; draft = null; pendingArt = undefined; dirty = false; $('search').value = ''; render();
});
$('search').addEventListener('input', renderList);
$('catalog-list').addEventListener('click', event => {
  const itemButton = event.target.closest('[data-product]');
  const categoryButton = event.target.closest('[data-category]');
  if ((!itemButton && !categoryButton) || !guard()) return;
  selectedProduct = itemButton?.dataset.product || selectedProduct;
  selectedCategory = categoryButton?.dataset.category || selectedCategory;
  if (itemButton) selectedCategory = catalog.categories.find(category => category.items.some(item => item.id === selectedProduct))?.id || selectedCategory;
  draft = null; pendingArt = undefined; dirty = false; render();
  $('editor-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
});
$('new-button').addEventListener('click', () => {
  if (!guard()) return;
  if (tab === 'products' && !catalog.categories.length) { notice('Crea una categoría antes de añadir productos.', true); return; }
  draft = tab === 'products' ? { type:'product', value:{ id:`product-${crypto.randomUUID().slice(0,8)}`, name:blankLocales(), description:blankLocales(), price:null, visible:true } } : { type:'category', value:{ id:`category-${crypto.randomUUID().slice(0,8)}`, title:blankLocales(), source:'1-PRE.webp', items:[], visible:true } };
  if (tab === 'products') selectedCategory ||= catalog.categories[0].id;
  pendingArt = undefined; dirty = false; renderEditor(); $('editor-panel').scrollIntoView({ behavior:'smooth', block:'start' });
});
$('editor-panel').addEventListener('submit', async event => {
  if (event.target.id !== 'edit-form') return; event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Guardando y traduciendo…';
  try { if (tab === 'products') await saveProduct(event.target); else await saveCategory(event.target); }
  catch (error) { notice(error.message, true); }
  finally { if (button.isConnected) { button.disabled = false; button.textContent = originalLabel; } }
});
$('editor-panel').addEventListener('input', event => {
  if (event.target.id === 'focus-x' || event.target.id === 'focus-y') updateArtPreview();
  if (event.target.id !== 'art-file') dirty = true;
});
$('editor-panel').addEventListener('change', async event => {
  if (event.target.id === 'has-addon') { $('addon-fields').hidden = !event.target.checked; dirty = true; }
  if (event.target.name === 'source') updateArtPreview();
  if (event.target.id !== 'art-file') return;
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) { notice('La imagen supera 10 MB.', true); return; }
  event.target.disabled = true; notice('Preparando imagen para escritorio y móvil…');
  try {
    const result = await api('/api/admin/upload', { method:'POST', body:await file.arrayBuffer(), headers:{ 'content-type':file.type } });
    pendingArt = result.art; dirty = true; $('focus-x').value = '50'; $('focus-y').value = '50'; updateArtPreview();
    notice('Imagen preparada. Pulsa «Guardar categoría» para usarla en la carta.');
  } catch (error) { notice(error.message, true); }
  finally { if (event.target.isConnected) event.target.disabled = false; }
});
$('editor-panel').addEventListener('click', async event => {
  const target = event.target;
  if (target.id === 'add-option') { const list = $('options-list'); list.insertAdjacentHTML('beforeend', optionMarkup(null,list.children.length)); dirty = true; }
  if (target.closest('[data-remove-option]')) { target.closest('[data-option]').remove(); dirty = true; }
  if (target.closest('[data-cancel]')) { draft = null; pendingArt = undefined; dirty = false; renderEditor(); }
  if (target.closest('[data-delete]')) { try { await removeSelected(); } catch (error) { notice(error.message,true); } }
  if (target.id === 'remove-art') { pendingArt = false; dirty = true; $('focus-x').value = '50'; $('focus-y').value = '50'; updateArtPreview(); }
  const move = target.closest('[data-move]');
  if (move) { if (dirty && !guard()) return; try { await moveCategory(Number(move.dataset.move)); } catch (error) { notice(error.message,true); } }
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

try {
  const session = await api('/api/admin/session'); csrf = session.csrf;
  catalog = await api('/api/admin/menu'); selectedCategory = catalog.categories[0]?.id || null; selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null; showApp();
} catch { showLogin(); }
