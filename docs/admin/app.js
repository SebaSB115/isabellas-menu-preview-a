import { api, resetDemo } from './demo-store.js';
import { formSnapshot, tablerComponents } from './form-state.js';
const $ = id => document.getElementById(id);
const languages = [['es','Español'],['en','English'],['de','Deutsch'],['ar','العربية · RTL'],['he','עברית · RTL']];
const originalPages = [['1-PRE.webp','Ensaladas y sopas'],['2-PRE.webp','Entradas'],['7-PRE.webp','Focaccia y strombolis'],['ALL-4-D.webp','Pastas y risotto'],['4-PRE.webp','Pastas adicionales'],['ALL-4-C.webp','Carnes'],['ALL-4-A.webp','Cocteles clásicos'],['ALL-4-B.webp','Café']];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const priceText = amount => amount == null ? 'Sin precio' : `₡${new Intl.NumberFormat('en-US').format(amount)}`;
const blankLocales = () => Object.fromEntries(languages.map(([code]) => [code,'']));
const assetUrl = path => path?.startsWith('./') ? `../${path.slice(2)}` : path;
const originalArt = source => `../assets/menu-art/${source.replace(/\.webp$/, '-art.webp')}`;
let csrf = '';
let permissions = [];
let role = 'staff';
let catalog = null;
let tab = ({'#categorias':'categories','#avisos':'content','#promociones':'content','#impreso':'print'})[location.hash] || 'products';
let selectedCategory = null;
let selectedProduct = null;
let draft = null;
let pendingArt;
let pendingPhoto;
let pendingEditorialPhoto;
let baseline = '';
let saving = false;
let uploading = false;
let printLanguage = 'es';
let printVersion = null;
let dirty = false;
let noticeTimer;
let editorView = 'list';
let unpricedOnly = false;
let productFeedback = '';
let categoryFeedback = '';
const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const isUnpriced = item => item.price == null && !item.options?.some(option => option.price != null);

function notice(message, error = false) {
  clearTimeout(noticeTimer);
  $('notice').textContent = message;
  $('notice').classList.toggle('is-error', error);
  $('notice').setAttribute('role', error ? 'alert' : 'status');
  $('notice').setAttribute('aria-live', error ? 'assertive' : 'polite');
  $('notice').hidden = false;
  if (!error) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5500);
}
function showLogin() { $('login-screen').hidden = false; $('app-shell').hidden = true; document.querySelector('.skip-link').href = '#acceso'; }
function showApp() {
  const products = permissions.includes('isabella.products');
  for (const name of ['content','print']) document.querySelector(`[data-tab="${name}"]`).hidden = !permissions.includes(`isabella.${name}`);
  const categories = permissions.includes('isabella.categories');
  document.querySelector('[data-tab="products"]').hidden = !products;
  document.querySelector('[data-tab="categories"]').hidden = !categories;
  if ($('staff-link')) $('staff-link').hidden = role !== 'owner';
  if (tab === 'products' && !products) tab = 'categories';
  if (tab === 'categories' && !categories) tab = 'products';
  if (!permissions.includes(`isabella.${tab}`)) tab = ['products','categories','content','print'].find(name => permissions.includes(`isabella.${name}`)) || 'products';
  $('login-screen').hidden = true; $('app-shell').hidden = false; document.querySelector('.skip-link').href = '#main'; render();
}
async function guard() {
  if (saving || uploading) { notice('Espera a que termine la operación en curso.'); return false; }
  if (!dirty) return true;
  const dialog=$('changes-dialog');
  const choice=await new Promise(resolve=>{
    const finish=value=>{dialog.removeEventListener('click',click);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(value);};
    const click=event=>{const value=event.target.closest('[data-choice]')?.dataset.choice;if(value)finish(value);};
    const cancel=event=>{event.preventDefault();finish('stay');};
    dialog.addEventListener('click',click);dialog.addEventListener('cancel',cancel);dialog.showModal();
  });
  if(choice==='stay')return false;
  if(choice==='save')return performSave($('edit-form'));
  dirty=false;return true;
}
function currentCategory() { return catalog.categories.find(category => category.id === selectedCategory); }
function currentProduct() { return catalog.categories.flatMap(category => category.items).find(item => item.id === selectedProduct); }
function countProducts() { return catalog.categories.reduce((count, category) => count + category.items.length, 0); }
function setWorkspaceView(view, focus = false) {
  editorView = view;
  const layout = document.querySelector('.content-layout');
  layout.dataset.workspaceView = view;
  if (!focus) return;
  requestAnimationFrame(() => {
    const target = view === 'editor' ? $('editor-title') : $('catalog-list').querySelector('[aria-current="true"]') || $('search');
    target?.focus({ preventScroll:true });
    (view === 'editor' ? $('editor-panel') : $('catalog-panel')).scrollIntoView({ block:'start' });
  });
}

function render() {
  if (!catalog) return;
  const special = ['content','print'].includes(tab);
  document.querySelector('.content-layout').hidden = special;
  $('tools-panel').hidden = !special;
  if (special) { renderTools(); return; }
  $('tools-panel').replaceChildren();
  const isProduct = tab === 'products';
  $('breadcrumb-current').textContent = isProduct ? 'Productos' : 'Categorías y fondos';
  $('page-title').textContent = isProduct ? 'Productos' : 'Categorías y fondos';
  $('page-description').textContent = isProduct ? 'Precios, textos y disponibilidad de la carta.' : 'Orden y presentación de las categorías de la carta.';
  $('new-button').textContent = isProduct ? '+ Nuevo producto' : '+ Nueva categoría';
  $('new-button').hidden = !isProduct;
  $('category-list-action').hidden = isProduct;
  $('search').placeholder = isProduct ? 'Buscar productos' : 'Buscar categorías';
  $('product-count').textContent = countProducts();
  $('category-count').textContent = catalog.categories.length;
  document.querySelector('.content-layout').classList.toggle('is-products', isProduct);
  document.querySelector('.content-layout').classList.toggle('is-categories', !isProduct);
  $('product-list-controls').hidden = !isProduct;
  $('unpriced-filter').setAttribute('aria-pressed', String(unpricedOnly));
  setWorkspaceView(editorView);
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderList(); renderEditor(); tablerComponents();
}
function renderList() {
  const search = normalizeSearch($('search').value);
  const list = $('catalog-list');
  if (tab === 'categories') {
    const visible = catalog.categories.filter(category => normalizeSearch(category.title.es).includes(search));
    $('list-count').textContent = `${visible.length} ${visible.length === 1 ? 'categoría' : 'categorías'}`;
    list.innerHTML = visible.length ? visible.map(category => `<button class="catalog-row category-row ${category.id === selectedCategory ? 'is-selected' : ''}" type="button" data-category="${escapeHtml(category.id)}" ${category.id === selectedCategory ? 'aria-current="true"' : ''}><span><strong>${escapeHtml(category.title.es)}</strong><small>${category.items.length} productos${category.art ? ' · Fondo propio' : ''}${category.visible === false ? ' · Oculta' : ''}</small></span></button>`).join('') : '<p class="catalog-empty">No hay categorías con esa búsqueda.</p>';
    return;
  }
  let count = 0;
  $('unpriced-count').textContent = catalog.categories.reduce((sum, category) => sum + category.items.filter(isUnpriced).length, 0);
  list.innerHTML = catalog.categories.map(category => {
    const matches = category.items.filter(item => (!unpricedOnly || isUnpriced(item)) && normalizeSearch(`${item.name.es} ${item.description.es} ${category.title.es} ${item.id}`).includes(search));
    count += matches.length;
    if (!matches.length) return '';
    return `<p class="catalog-section-title">${escapeHtml(category.title.es)} · ${matches.length}</p>${matches.map(item => {
      const variantPrices = item.options?.map(option => option.price).filter(price => price != null) || [];
      const displayPrice = item.price != null ? priceText(item.price) : variantPrices.length ? `Desde ${priceText(Math.min(...variantPrices))}` : 'Sin precio';
      return `<button class="catalog-row product-row ${item.id === selectedProduct ? 'is-selected' : ''}" type="button" data-product="${escapeHtml(item.id)}" ${item.id === selectedProduct ? 'aria-current="true"' : ''}><span class="product-row__main"><strong>${escapeHtml(item.name.es)}</strong>${item.visible === false || item.options?.length ? `<small>${item.visible === false ? 'Oculto' : ''}${item.visible === false && item.options?.length ? ' · ' : ''}${item.options?.length ? `${item.options.length} variantes` : ''}</small>` : ''}</span><span class="price ${isUnpriced(item) ? 'is-unpriced' : ''}">${escapeHtml(displayPrice)}</span></button>`;
    }).join('')}`;
  }).join('') || `<p class="catalog-empty">${unpricedOnly ? 'No hay productos sin precio con esta búsqueda.' : 'No hay productos con esa búsqueda.'} Ajusta el filtro o la búsqueda.</p>`;
  $('list-count').textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;
}
function field(label, name, value, options = {}) {
  const { type = 'text', required = false, full = false, min = '', max = '', placeholder = '' } = options;
  const attrs = `${required ? ' required' : ''}${min !== '' ? ` min="${min}"` : ''}${max !== '' ? ` ${type === 'number' ? 'max' : 'maxlength'}="${max}"` : ''}${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}`;
  return `<label class="field ${full ? 'field--full' : ''}"><span>${escapeHtml(label)}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea name="${name}"${attrs}>${escapeHtml(value)}</textarea>` : `<input name="${name}" type="${type}" value="${escapeHtml(value)}"${attrs} />`}</label>`;
}
function spanishField(value, name, kind = 'name') {
  return field(kind === 'name' ? 'Nombre en español' : 'Descripción en español', `${name}-es`, value?.es || '', { required:true, type:kind === 'description' ? 'textarea' : 'text', max:kind === 'description' ? 1000 : 150 });
}
function optionMarkup(option, index) {
  return `<div class="option-card" data-option><header><strong>Variante ${index + 1}</strong><button class="danger-button" type="button" data-remove-option>Quitar</button></header><div class="field-grid">${field('Precio en ₡', 'option-price', option?.price ?? '', { type:'number', min:0, max:10000000, required:true })}${field('Nombre en español', 'option-es', option?.label?.es || '', { required:true })}</div></div>`;
}
function productArtMarkup(categoryId) {
  const category = catalog.categories.find(group => group.id === categoryId);
  if (!category) return '<p class="helper">Elige una categoría para ver el arte utilizado en la carta.</p>';
  const art = category.art;
  const url = art?.src ? assetUrl(art.src) : originalArt(category.source);
  return `<div class="product-art"><img class="product-art__image" src="${escapeHtml(url)}" alt="Arte de la categoría ${escapeHtml(category.title.es)}" style="object-position:${art?.x ?? 50}% ${art?.y ?? 50}%" /><div><strong class="product-art__name">${escapeHtml(category.title.es)}</strong><p>El plato utiliza el arte de su categoría. No tiene imagen individual en este editor.</p></div></div>`;
}
function productPhotoMarkup(item) {
  const photo=pendingPhoto===undefined?item.photo:pendingPhoto;
  const source=photo?.src?escapeHtml(assetUrl(photo.src)):'';
  const focus=`${photo?.x ?? 50}% ${photo?.y ?? 50}%`;
  const original=photo?.original?escapeHtml(assetUrl(photo.original)):'';
  return `<details class="form-section product-detail" id="product-image"><summary><span>Imagen</span><small>Fotografía del plato</small></summary><div class="product-detail__body product-image-controls"><p class="helper">La fotografía individual aparece en la ficha del plato, no en la lista. Ajusta el encuadre antes de guardar.</p><div class="product-photo-previews" id="product-photo-previews" ${photo?'':'hidden'}><figure class="product-photo-frame"><img id="product-photo-preview" ${source?`src="${source}"`:''} alt="Vista previa de la fotografía en escritorio" style="object-position:${focus}"><figcaption>Escritorio</figcaption></figure><figure class="product-photo-frame product-photo-frame--mobile"><img id="product-photo-mobile-preview" ${source?`src="${source}"`:''} alt="Vista previa de la fotografía en móvil" style="object-position:${focus}"><figcaption>Móvil</figcaption></figure></div><div class="product-photo-tools"><label class="field"><span>Fotografía del producto</span><input id="product-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG o WebP · mínimo 500 × 500 px · máximo 10 MB</small></label><fieldset class="focus-controls product-focus-controls" id="product-focus-controls" ${photo?'':'disabled'}><legend>Punto focal</legend><p class="helper">Elige qué parte del plato debe permanecer visible en ambos formatos.</p><div class="range-row"><label for="product-focus-x">Horizontal</label><input id="product-focus-x" type="range" min="0" max="100" value="${photo?.x ?? 50}"><output id="product-focus-x-value" for="product-focus-x">${photo?.x ?? 50}%</output></div><div class="range-row"><label for="product-focus-y">Vertical</label><input id="product-focus-y" type="range" min="0" max="100" value="${photo?.y ?? 50}"><output id="product-focus-y-value" for="product-focus-y">${photo?.y ?? 50}%</output></div></fieldset><a class="text-button" id="product-original-link" ${original?`href="${original}"`:''} download ${original?'':'hidden'}>Descargar archivo original</a><button type="button" class="text-button" id="remove-product-photo" ${photo?'':'hidden'}>Quitar fotografía</button></div></div></details>`;
}
function renderProductEditor() {
  const item = draft?.type === 'product' ? draft.value : currentProduct();
  const creating = draft?.type === 'product';
  if (!item) { $('editor-panel').innerHTML = '<div class="catalog-empty"><h2>Selecciona un producto</h2><p>Elige un plato de la lista o crea uno nuevo.</p></div>'; return; }
  const category = creating ? selectedCategory : catalog.categories.find(group => group.items.some(entry => entry.id === item.id))?.id;
  const optionSummary = [item.options?.length ? `${item.options.length} variantes` : '', item.addon ? '1 adicional' : ''].filter(Boolean).join(' · ') || 'Variantes y adicionales';
  $('editor-panel').innerHTML = `<form id="edit-form" data-kind="product"><button class="editor-back text-button" type="button" data-back-to-list>← Volver a productos</button><div class="editor-heading"><div><p class="editor-eyebrow">${creating ? 'Nuevo producto' : 'Editar producto'}</p><h2 id="editor-title" tabindex="-1">${creating ? 'Añadir plato' : escapeHtml(item.name.es)}</h2></div><span class="status-pill">${item.visible === false ? 'Oculto' : 'Visible'}</span></div>
    <section class="form-section product-information" aria-labelledby="product-information-title"><h3 id="product-information-title">Información principal</h3><div class="field-grid">${field('Nombre en español', 'name-es', item.name?.es || '', { required:true, full:true, max:150 })}<label class="field"><span>Categoría *</span><select name="category" required>${catalog.categories.map(group => `<option value="${escapeHtml(group.id)}" ${group.id === category ? 'selected' : ''}>${escapeHtml(group.title.es)}</option>`).join('')}</select></label>${field('Precio en ₡', 'price', item.price ?? '', { type:'number', min:0, max:10000000, placeholder:'Pendiente de confirmar' })}${field('Descripción en español', 'description-es', item.description?.es || '', { required:true, full:true, type:'textarea', max:1000 })}<label class="toggle-field field--full"><input type="checkbox" name="visible" ${item.visible === false ? '' : 'checked'} /><span>Visible en la carta</span></label><label class="toggle-field field--full"><input type="checkbox" name="available" ${item.available===false?'':'checked'}><span>Disponible hoy</span></label><label class="toggle-field field--full"><input type="checkbox" name="detailEnabled" ${item.detailEnabled!==false?'checked':''}><span>Permitir abrir el detalle del plato</span></label></div></section>
    ${productPhotoMarkup(item)}
    <details class="form-section product-detail product-options" id="product-options" ${item.options?.length || item.addon ? 'open' : ''}><summary><span>Opciones</span><small>${escapeHtml(optionSummary)}</small></summary><div class="product-detail__body"><div class="product-option-group"><h4>Variantes con precio propio</h4><p>Para opciones como pollo y carne.</p><div id="options-list">${(item.options || []).map(optionMarkup).join('')}</div><button class="text-button" type="button" id="add-option">+ Añadir variante</button></div><div class="product-option-group"><h4>Adicional</h4><label class="toggle-field"><input type="checkbox" id="has-addon" ${item.addon ? 'checked' : ''} /><span>Este plato ofrece un adicional</span></label><div id="addon-fields" ${item.addon ? '' : 'hidden'}><div class="field-grid">${field('Precio del adicional en ₡', 'addon-price', item.addon?.price ?? '', { type:'number', min:0, max:10000000 })}${field('Nombre en español', 'addon-es', item.addon?.label?.es || '')}</div></div></div></div></details>
    <p class="product-form-error" id="product-form-error" role="alert" hidden></p><div class="form-actions product-form-actions">${creating ? '<button class="text-button" type="button" data-cancel>Cancelar</button>' : '<button class="danger-button" type="button" data-delete>Eliminar producto</button>'}<span class="product-edit-state" id="product-edit-state" role="status" aria-live="polite">${escapeHtml(productFeedback)}</span><button class="primary-button" type="submit">${creating ? 'Crear producto' : 'Guardar cambios'}</button></div></form>`;
}
function imagePreview(category, art) {
  const url = art?.src ? assetUrl(art.src) : originalArt(category.source);
  const position = `${art?.x ?? 50}% ${art?.y ?? 50}%`;
  const name = escapeHtml(category.title.es || 'la nueva categoría');
  return `<div class="image-preview"><figure class="image-frame desktop"><img class="preview-image" src="${escapeHtml(url)}" style="object-position:${position}" alt="Arte de ${name} en escritorio" /><figcaption>Escritorio</figcaption></figure><figure class="image-frame mobile"><img class="preview-image" src="${escapeHtml(url)}" style="object-position:${position}" alt="Arte de ${name} en móvil" /><figcaption>Móvil</figcaption></figure></div>`;
}
const editorialSamples = new Set(['salads','starters','focaccia','stromboli','pasta','meats','cocktails','coffee']);
function editorialPhotoMarkup(category) {
  const photo = pendingEditorialPhoto === undefined ? category.editorialPhoto : pendingEditorialPhoto;
  const sample = editorialSamples.has(category.id) ? `../design-lab/assets/reference-v2/${category.id}-720.webp` : '';
  const src = photo?.src ? assetUrl(photo.srcSmall || photo.src) : sample;
  const focus = `${photo?.x ?? 50}% ${photo?.y ?? 50}%`;
  return `<section class="form-section category-editorial-photo" aria-labelledby="editorial-photo-title"><h3 id="editorial-photo-title">Fotografía de la carta V2</h3><p class="helper">Aparece junto a los platos de esta categoría. Las imágenes de muestra no son fotografías oficiales.</p><div class="category-editorial-photo__layout"><div class="category-editorial-photo__previews" id="editorial-photo-previews" ${src?'':'hidden'}><figure><img class="editorial-photo-preview" ${src?`src="${escapeHtml(src)}"`:''} alt="Vista previa de escritorio" style="object-position:${focus}"><figcaption>Escritorio · vertical</figcaption></figure><figure><img class="editorial-photo-preview editorial-photo-preview--mobile" ${src?`src="${escapeHtml(src)}"`:''} alt="Vista previa de móvil" style="object-position:${focus}"><figcaption>Móvil · horizontal</figcaption></figure></div><div class="category-editorial-photo__controls"><label class="field"><span>Sustituir fotografía</span><input id="editorial-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG o WebP · máximo 10 MB</small></label><fieldset class="focus-controls" id="editorial-focus-controls" ${photo?'':'disabled'}><legend>Encuadre de la foto propia</legend><div class="range-row"><label for="editorial-focus-x">Horizontal</label><input id="editorial-focus-x" type="range" min="0" max="100" value="${photo?.x ?? 50}"><output id="editorial-focus-x-value" for="editorial-focus-x">${photo?.x ?? 50}%</output></div><div class="range-row"><label for="editorial-focus-y">Vertical</label><input id="editorial-focus-y" type="range" min="0" max="100" value="${photo?.y ?? 50}"><output id="editorial-focus-y-value" for="editorial-focus-y">${photo?.y ?? 50}%</output></div></fieldset><button class="text-button" type="button" id="remove-editorial-photo" ${photo?'':'hidden'}>Usar imagen de muestra</button></div></div></section>`;
}
function renderCategoryEditor() {
  const category = draft?.type === 'category' ? draft.value : currentCategory();
  const creating = draft?.type === 'category';
  if (!category) { $('editor-panel').innerHTML = '<div class="catalog-empty"><h2>Selecciona una categoría</h2><p>Elige una categoría o crea una nueva.</p></div>'; return; }
  const art = pendingArt === undefined ? category.art : pendingArt;
  const index = catalog.categories.findIndex(group => group.id === category.id);
  const positionOptions = Array.from({ length:catalog.categories.length + 1 }, (_, position) => `<option value="${position}" ${position === catalog.categories.length ? 'selected' : ''}>${position + 1}${position === catalog.categories.length ? ' · al final' : ''}</option>`).join('');
  const destinations = catalog.categories.filter(group => group.id !== category.id);
  $('editor-panel').innerHTML = `<form id="edit-form" data-kind="category"><button class="editor-back text-button" type="button" data-back-to-list>← Volver a categorías</button><div class="editor-heading"><div><p class="editor-eyebrow">${creating ? 'Nueva categoría' : 'Editar categoría'}</p><h2 id="editor-title" tabindex="-1">${creating ? 'Añadir sección' : escapeHtml(category.title.es)}</h2><p>${creating ? 'Define cómo aparecerá en la carta.' : `${category.items.length} productos`}</p></div><span class="status-pill">${category.visible === false ? 'Oculta' : 'Visible'}</span></div>
    <section class="form-section category-information ${creating ? 'category-information--new' : ''}" aria-labelledby="category-information-title"><h3 id="category-information-title">Información de la categoría</h3><div class="field-grid">${field('Nombre en español', 'title-es', category.title?.es || '', { required:true, max:100 })}${creating ? `<label class="field"><span>Posición en la carta</span><select name="position">${positionOptions}</select></label>` : ''}<label class="toggle-field field--full"><input type="checkbox" name="visible" ${category.visible === false ? '' : 'checked'} /><span>Visible en la carta</span></label></div>${creating ? '' : `<div class="category-order"><div><strong>Orden en la carta</strong><small>Posición ${index + 1} de ${catalog.categories.length}</small></div><div class="category-order__actions"><button class="text-button" type="button" data-move="-1" ${index <= 0 ? 'disabled' : ''}>↑ Subir</button><button class="text-button" type="button" data-move="1" ${index >= catalog.categories.length - 1 ? 'disabled' : ''}>↓ Bajar</button></div></div>`}</section>
    <section class="form-section category-art" aria-labelledby="category-art-title"><div class="section-heading"><div><h3 id="category-art-title">Arte de la categoría</h3><p>Vista previa de la ilustración que acompaña a los platos.</p></div></div><div class="category-art-workspace"><div class="category-art-stage"><h4>Vista previa</h4>${imagePreview(category, art)}</div><div class="category-art-controls"><h4>Imagen y encuadre</h4><label class="field"><span>Página de origen</span><select name="source">${originalPages.map(([file,label]) => `<option value="${file}" ${category.source === file ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label><div class="image-upload"><label class="field"><span>Usar imagen propia</span><input type="file" id="art-file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG o WebP · hasta 10 MB</small></label><button class="text-button" type="button" id="remove-art" ${art ? '' : 'hidden'}>Usar arte original</button></div><fieldset class="focus-controls" id="focus-controls" ${art ? '' : 'disabled'}><legend>Encuadre</legend><p class="helper">Ajusta la imagen propia en ambas vistas.</p><div class="range-row"><label for="focus-x">Horizontal</label><input id="focus-x" type="range" min="0" max="100" value="${art?.x ?? 50}" /><output id="focus-x-value" for="focus-x">${art?.x ?? 50}%</output></div><div class="range-row"><label for="focus-y">Vertical</label><input id="focus-y" type="range" min="0" max="100" value="${art?.y ?? 50}" /><output id="focus-y-value" for="focus-y">${art?.y ?? 50}%</output></div></fieldset></div></div></section>
    <p class="product-form-error" id="category-form-error" role="alert" hidden></p><div class="form-actions category-form-actions">${creating ? '<button class="text-button" type="button" data-cancel>Cancelar</button>' : ''}<span class="product-edit-state" id="category-edit-state" role="status" aria-live="polite">${escapeHtml(categoryFeedback)}</span><button class="primary-button" type="submit">${creating ? 'Crear categoría' : 'Guardar cambios'}</button></div></form>${creating ? '' : `<section class="category-remove" aria-labelledby="category-remove-title"><h3 id="category-remove-title">Eliminar categoría</h3>${category.items.length ? `<p>Esta categoría contiene ${category.items.length} ${category.items.length === 1 ? 'producto' : 'productos'}. Reasígnalos antes de eliminarla; se conservarán íntegros.</p>${destinations.length ? `<label class="field"><span>Mover productos a</span><select id="reassign-category" aria-label="Mover productos a" aria-describedby="reassign-help"><option value="">Selecciona otra categoría</option>${destinations.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.title.es)}${group.visible === false ? ' · oculta' : ''}</option>`).join('')}</select><small id="reassign-help">Si eliges una categoría oculta, sus productos dejarán de verse en la carta hasta que la hagas visible.</small><small class="field-error" id="reassign-error" role="alert" hidden>Elige una categoría de destino.</small></label>` : '<p>Crea otra categoría antes de poder reasignar estos productos.</p>'}` : '<p>Esta categoría está vacía.</p>'}<button class="danger-button" type="button" data-delete ${category.items.length && !destinations.length ? 'disabled' : ''}>Eliminar categoría</button></section>`}`;
  $('editor-panel').querySelector('.category-art').insertAdjacentHTML('beforebegin', editorialPhotoMarkup(category));
}
function snapshot() {
  const value = draft?.value || (tab === 'products' ? currentProduct() : currentCategory());
  const photo=pendingPhoto===undefined?value?.photo:pendingPhoto;
  const editorial = pendingEditorialPhoto === undefined ? value?.editorialPhoto : pendingEditorialPhoto;
  return formSnapshot($('edit-form'), { art:tab==='categories' ? (pendingArt===undefined ? value?.art || null : pendingArt || null) : null, editorial:tab==='categories'&&editorial ? {...editorial,x:Number($('editorial-focus-x')?.value ?? editorial.x),y:Number($('editorial-focus-y')?.value ?? editorial.y)} : null, photo:tab==='products'&&photo ? {...photo,x:Number($('product-focus-x')?.value ?? photo.x),y:Number($('product-focus-y')?.value ?? photo.y)} : null });
}
function prepareForm() {
  const form=$('edit-form');if(!form)return;
  baseline=snapshot();dirty=false;
  const actions=form.querySelector('.form-actions');
  if(actions&&!actions.querySelector('[data-discard]')) actions.insertAdjacentHTML('afterbegin','<button type="button" class="text-button" data-discard hidden>Descartar cambios</button>');
  tablerComponents();markProductDirty();
}
function renderEditor() { if (tab === 'products') renderProductEditor(); else renderCategoryEditor(); prepareForm(); }
function readSpanish(form, prefix, previous) { return { ...blankLocales(), ...previous, es:String(form.elements[`${prefix}-es`]?.value || '').trim() }; }
function readPrice(value) { return value === '' ? null : Number(value); }
function showProductError(control, message) {
  const kind = $('edit-form')?.dataset.kind || 'product';
  const error = $(`${kind}-form-error`);
  if (error) { error.textContent = message; error.hidden = false; }
  if (control) {
    control.setAttribute('aria-invalid', 'true');
    const field = control.closest('.field');
    if (field) {
      let detail = field.querySelector('.field-error');
      if (!detail) {
        detail = document.createElement('span');
        detail.className = 'field-error';
        detail.id = `${kind}-field-error-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        field.append(detail);
      }
      detail.textContent = message;
      control.setAttribute('aria-describedby', detail.id);
    }
    for (let parent=control.parentElement;parent;parent=parent.parentElement) if(parent.tagName==='DETAILS')parent.open=true;
    control.focus();
  }
}
function clearProductError(control) {
  control.removeAttribute('aria-invalid');
  const detail = control.closest('.field')?.querySelector('.field-error');
  if (detail && control.getAttribute('aria-describedby') === detail.id) control.removeAttribute('aria-describedby');
  detail?.remove();
  const error = $(`${$('edit-form')?.dataset.kind || 'product'}-form-error`);
  if (error) { error.textContent = ''; error.hidden = true; }
}
function markProductDirty() {
  dirty = snapshot() !== baseline;
  const form=$('edit-form'), state=form?.querySelector('.product-edit-state');
  if(state) state.textContent=dirty?'Cambios sin guardar':(tab==='products'?productFeedback:categoryFeedback)||'Sin cambios pendientes';
  const save=form?.querySelector('[type="submit"]');if(save)save.disabled=!dirty||saving||uploading;
  const discard=form?.querySelector('[data-discard]');if(discard)discard.hidden=!dirty;
  tablerComponents(form || document);
}
async function performSave(form) {
  if(!form||saving||uploading||!dirty)return false;
  if(!form.reportValidity())return false;
  const button=form.querySelector('[type="submit"]'), label=button.textContent;
  saving=true;button.disabled=true;button.textContent='Guardando…';form.setAttribute('aria-busy','true');
  try {
    if(tab==='products')await saveProduct(form);
    else if(tab==='categories')await saveCategory(form);
    else {
      const a={enabled:form.elements.enabled.checked,moving:form.elements.moving.checked,es:form.elements.es.value.trim(),en:form.elements.en.value.trim()};
      if(a.enabled&&(!a.es||!a.en)){showProductError(form.elements[!a.es?'es':'en'],'Completa la promoción en español e inglés antes de mostrarla.');return false;}
      catalog=await api('/api/admin/content',{method:'PUT',body:JSON.stringify({version:catalog.version,settings:{announcement:a,publicUrl:form.elements.publicUrl.value.trim()}})});dirty=false;categoryFeedback=a.enabled?'Promoción guardada y visible en la carta.':'Promoción guardada y oculta en la carta.';renderTools();
    }
    return !dirty;
  } catch(error) { notice(error.message + (error.status===409?' Tus cambios permanecen en el formulario. Copia lo editado antes de recargar.':''),true);return false; }
  finally { saving=false;if(form.isConnected){form.removeAttribute('aria-busy');button.textContent=label;}markProductDirty(); }
}
async function commit(next, message) {
  const saved = await api('/api/admin/menu', { method:'PUT', body:JSON.stringify({ version:catalog.version, categories:next }) });
  catalog = saved; dirty = false; draft = null; pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; notice(message); render();
}
async function saveProduct(form) {
  const old = draft?.type === 'product' ? draft.value : currentProduct();
  const categoryId = form.elements.category.value;
  const name = readSpanish(form,'name',old.name);
  const description = readSpanish(form,'description',old.description);
  if (!name.es) return showProductError(form.elements['name-es'], 'Escribe el nombre en español.');
  if (!description.es) return showProductError(form.elements['description-es'], 'Escribe la descripción en español.');
  const options = [...form.querySelectorAll('[data-option]')].map((card, index) => ({ price:readPrice(card.querySelector('[name="option-price"]').value), label:{ ...blankLocales(), ...old.options?.[index]?.label, es:card.querySelector('[name="option-es"]').value.trim() } }));
  const invalidOption = options.findIndex(option => option.price === null || !option.label.es);
  if (invalidOption >= 0) {
    const card = form.querySelectorAll('[data-option]')[invalidOption];
    return showProductError(card.querySelector(options[invalidOption].price === null ? '[name="option-price"]' : '[name="option-es"]'), `Completa el nombre y el precio de la variante ${invalidOption + 1}.`);
  }
  const manualEnglish=Boolean(old.manualEnglish && name.es===String(old.name?.es||'').trim() && description.es===String(old.description?.es||'').trim());
  const nextItem = { ...old, name, description, price:readPrice(form.elements.price.value), visible:form.elements.visible.checked, available:form.elements.available.checked, detailEnabled:form.elements.detailEnabled.checked, manualEnglish };
  const photo=pendingPhoto===undefined?old.photo:pendingPhoto;
  if(photo)nextItem.photo={...photo,x:Number($('product-focus-x').value),y:Number($('product-focus-y').value)};else delete nextItem.photo;
  if (options.length) nextItem.options = options; else delete nextItem.options;
  if ($('has-addon').checked) {
    const addonPrice = readPrice(form.elements['addon-price'].value);
    const addonLabel = readSpanish(form, 'addon', old.addon?.label);
    if (addonPrice === null || !addonLabel.es) return showProductError(form.elements[addonPrice === null ? 'addon-price' : 'addon-es'], 'Completa el nombre y el precio del adicional.');
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
  selectedProduct = nextItem.id; selectedCategory = categoryId; productFeedback = 'Cambios guardados.'; render();
}
async function saveCategory(form) {
  const old = draft?.type === 'category' ? draft.value : currentCategory();
  const title = readSpanish(form,'title',old.title);
  if (title.es.length < 2) return showProductError(form.elements['title-es'], 'Escribe un nombre de al menos 2 caracteres.');
  if (title.es.length > 100) return showProductError(form.elements['title-es'], 'El nombre no puede superar 100 caracteres.');
  const normalizedTitle = normalizeSearch(title.es).replace(/\s+/g, ' ');
  if (catalog.categories.some(category => category.id !== old.id && normalizeSearch(category.title.es).replace(/\s+/g, ' ') === normalizedTitle)) return showProductError(form.elements['title-es'], 'Ya existe una categoría con ese nombre.');
  const art = pendingArt === undefined ? old.art : pendingArt;
  const nextCategory = { ...old, title, source:form.elements.source.value, visible:form.elements.visible.checked };
  if (art) nextCategory.art = { ...art, x:Number($('focus-x').value), y:Number($('focus-y').value) };
  else delete nextCategory.art;
  const editorial = pendingEditorialPhoto === undefined ? old.editorialPhoto : pendingEditorialPhoto;
  if (editorial) nextCategory.editorialPhoto = { ...editorial, x:Number($('editorial-focus-x').value), y:Number($('editorial-focus-y').value) };
  else delete nextCategory.editorialPhoto;
  const next = structuredClone(catalog.categories);
  const index = next.findIndex(category => category.id === nextCategory.id);
  if (index < 0) {
    const position = Number(form.elements.position.value);
    if (!Number.isInteger(position) || position < 0 || position > next.length) return showProductError(form.elements.position, 'Elige una posición válida.');
    next.splice(position, 0, nextCategory);
  } else next[index] = nextCategory;
  await commit(next, draft?.type === 'category' ? 'Categoría creada.' : 'Categoría y fondo actualizados.');
  selectedCategory = nextCategory.id; categoryFeedback = 'Cambios guardados.'; render();
}
async function removeSelected() {
  if (tab === 'products') {
    const item = currentProduct();
    if (!item || !confirm(`¿Eliminar «${item.name.es}» de la carta?`)) return;
    const next = structuredClone(catalog.categories);
    next.forEach(category => { category.items = category.items.filter(entry => entry.id !== item.id); });
    await commit(next, 'Producto eliminado.');
    selectedProduct = next.flatMap(category => category.items)[0]?.id || null; render();
    return true;
  }
  const category = currentCategory();
  if (!category) return;
  const destinationId = $('reassign-category')?.value;
  const destination = catalog.categories.find(group => group.id === destinationId);
  if (category.items.length && !destination) {
    const select = $('reassign-category');
    if (!select) return notice('Crea otra categoría para reasignar los productos antes de eliminar esta.', true);
    select.setAttribute('aria-invalid', 'true');
    select.setAttribute('aria-describedby', 'reassign-help reassign-error');
    $('reassign-error').hidden = false;
    select.focus();
    return;
  }
  const question = category.items.length
    ? `¿Mover ${category.items.length} ${category.items.length === 1 ? 'producto' : 'productos'} de «${category.title.es}» a «${destination.title.es}» y eliminar la categoría?${destination.visible === false ? ' La categoría de destino está oculta y esos productos dejarán de verse en la carta.' : ''}`
    : `¿Eliminar la categoría vacía «${category.title.es}»?`;
  if (!confirm(question)) return;
  const next = structuredClone(catalog.categories);
  if (category.items.length) next.find(group => group.id === destinationId).items.push(...next.find(group => group.id === category.id).items);
  await commit(next.filter(group => group.id !== category.id), category.items.length ? 'Productos reasignados y categoría eliminada.' : 'Categoría eliminada.');
  selectedCategory = catalog.categories[0]?.id || null; render();
  return true;
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
  $('focus-controls').disabled = !art;
  $('focus-x-value').textContent = `${$('focus-x').value}%`;
  $('focus-y-value').textContent = `${$('focus-y').value}%`;
}
function updateEditorialPhotoPreview() {
  const category = draft?.type === 'category' ? draft.value : currentCategory();
  const photo = pendingEditorialPhoto === undefined ? category.editorialPhoto : pendingEditorialPhoto;
  const sample = editorialSamples.has(category.id) ? `../design-lab/assets/reference-v2/${category.id}-720.webp` : '';
  const src = photo?.src ? assetUrl(photo.srcSmall || photo.src) : sample;
  $('editorial-photo-previews').hidden = !src;
  $('editorial-focus-controls').disabled = !photo;
  $('remove-editorial-photo').hidden = !photo;
  for (const image of document.querySelectorAll('.editorial-photo-preview')) {
    if (src) image.src = src;
    image.style.objectPosition = `${$('editorial-focus-x').value}% ${$('editorial-focus-y').value}%`;
  }
  $('editorial-focus-x-value').textContent = `${$('editorial-focus-x').value}%`;
  $('editorial-focus-y-value').textContent = `${$('editorial-focus-y').value}%`;
}
function updateProductPhotoPreview() {
  const item=draft?.type==='product'?draft.value:currentProduct();
  const photo=pendingPhoto===undefined?item?.photo:pendingPhoto;
  const previews=$('product-photo-previews');
  previews.hidden=!photo;
  $('product-focus-controls').disabled=!photo;
  $('remove-product-photo').hidden=!photo;
  const original=$('product-original-link');
  original.hidden=!photo?.original;
  if(photo?.original)original.href=assetUrl(photo.original);
  for(const image of previews.querySelectorAll('img')){
    if(photo?.src)image.src=assetUrl(photo.src);
    image.style.objectPosition=`${$('product-focus-x').value}% ${$('product-focus-y').value}%`;
  }
  $('product-focus-x-value').textContent=`${$('product-focus-x').value}%`;
  $('product-focus-y-value').textContent=`${$('product-focus-y').value}%`;
}

$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('login-message').textContent = '';
  const button = event.target.querySelector('button[type="submit"]'); button.disabled = true;
  try { const result = await api('/api/admin/login', { method:'POST', body:JSON.stringify({ username:$('username').value.trim(), password:$('password').value }) }); csrf = result.csrf; role = result.role; permissions = result.permissions || []; $('password').value = ''; $('password').type = 'password'; $('toggle-password').textContent = 'Mostrar'; $('toggle-password').setAttribute('aria-pressed','false'); catalog = await api('/api/admin/menu'); selectedCategory = catalog.categories[0]?.id || null; selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null; showApp(); }
  catch (error) { $('login-message').textContent = error.message; }
  finally { button.disabled = false; }
});
$('toggle-password').addEventListener('click', () => {
  const visible = $('password').type === 'password';
  $('password').type = visible ? 'text' : 'password';
  $('toggle-password').textContent = visible ? 'Ocultar' : 'Mostrar';
  $('toggle-password').setAttribute('aria-pressed', String(visible));
});
$('logout').addEventListener('click', async () => { if (!await guard()) return; await api('/api/admin/logout', { method:'POST' }).catch(() => {}); csrf = ''; catalog = null; showLogin(); });
document.querySelector('.main-nav').addEventListener('click', async event => {
  const button = event.target.closest('[data-tab]'); if (!button || !await guard()) return;
  tab = button.dataset.tab; draft = null; pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; dirty = false; productFeedback = ''; categoryFeedback = ''; editorView = 'list'; unpricedOnly = false; $('search').value = ''; render();
  closeSidebar();
  $('page-title').focus();
});
const adminSidebar = $('admin-sidebar');
const sidebarToggle = $('sidebar-toggle');
function openSidebar() {
  adminSidebar.inert = false;
  adminSidebar.setAttribute('aria-hidden', 'false');
  sidebarToggle.setAttribute('aria-expanded', 'true');
  $('app-shell').classList.add('is-sidebar-open');
  document.body.classList.add('isabella-sidebar-open');
  $('sidebar-close').focus();
  requestAnimationFrame(() => {
    if ($('app-shell').classList.contains('is-sidebar-open') && !adminSidebar.contains(document.activeElement)) $('sidebar-close').focus();
  });
  setTimeout(() => {
    if ($('app-shell').classList.contains('is-sidebar-open') && !adminSidebar.contains(document.activeElement)) $('sidebar-close').focus();
  }, 320);
}
function closeSidebar(restoreFocus = true) {
  $('app-shell').classList.remove('is-sidebar-open');
  document.body.classList.remove('isabella-sidebar-open');
  adminSidebar.inert = true;
  adminSidebar.setAttribute('aria-hidden', 'true');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) sidebarToggle.focus();
}
sidebarToggle.addEventListener('click', openSidebar);
$('sidebar-close').addEventListener('click', () => closeSidebar());
$('sidebar-backdrop').addEventListener('click', () => closeSidebar());
document.addEventListener('keydown', event => {
  if (!$('app-shell').classList.contains('is-sidebar-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeSidebar(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...adminSidebar.querySelectorAll('button,a')].filter(control => !control.hidden && !control.disabled && control.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (!adminSidebar.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
    event.preventDefault(); (event.shiftKey ? last : first)?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first?.focus();
  }
});
let sidebarSwipeStart = null;
adminSidebar.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  sidebarSwipeStart = { x:touch.clientX, y:touch.clientY };
}, { passive:true });
adminSidebar.addEventListener('touchend', event => {
  if (!sidebarSwipeStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - sidebarSwipeStart.x;
  const deltaY = touch.clientY - sidebarSwipeStart.y;
  sidebarSwipeStart = null;
  if (deltaX < -70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) closeSidebar();
}, { passive:true });
$('search').addEventListener('input', renderList);
$('unpriced-filter').addEventListener('click', () => {
  unpricedOnly = !unpricedOnly;
  $('unpriced-filter').setAttribute('aria-pressed', String(unpricedOnly));
  renderList();
});
$('catalog-list').addEventListener('click', async event => {
  const itemButton = event.target.closest('[data-product]');
  const categoryButton = event.target.closest('[data-category]');
  if ((!itemButton && !categoryButton) || !await guard()) return;
  selectedProduct = itemButton?.dataset.product || selectedProduct;
  selectedCategory = categoryButton?.dataset.category || selectedCategory;
  if (itemButton) selectedCategory = catalog.categories.find(category => category.items.some(item => item.id === selectedProduct))?.id || selectedCategory;
  draft = null; pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; dirty = false; productFeedback = ''; categoryFeedback = ''; render();
  setWorkspaceView('editor', true);
});
async function startNew() {
  if (!await guard()) return;
  if (tab === 'products' && !catalog.categories.length) { notice('Crea una categoría antes de añadir productos.', true); return; }
  draft = tab === 'products' ? { type:'product', value:{ id:`product-${crypto.randomUUID().slice(0,8)}`, name:blankLocales(), description:blankLocales(), price:null, visible:true, detailEnabled:true } } : { type:'category', value:{ id:`category-${crypto.randomUUID().slice(0,8)}`, title:blankLocales(), source:'1-PRE.webp', items:[], visible:true } };
  if (tab === 'products') selectedCategory ||= catalog.categories[0].id;
  pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; dirty = false; productFeedback = ''; categoryFeedback = ''; renderEditor();
  setWorkspaceView('editor', true);
}
$('new-button').addEventListener('click', startNew);
$('new-category-button').addEventListener('click', startNew);
$('editor-panel').addEventListener('invalid', event => {
  if (event.target.closest('#edit-form')) {
    const control = event.target;
    const message = control.validity.valueMissing ? 'Completa este campo obligatorio.' : control.validity.rangeUnderflow || control.validity.badInput ? 'Escribe un precio válido, desde cero.' : 'Revisa el valor de este campo.';
    showProductError(control, message);
  }
}, true);
document.addEventListener('submit', async event => { if(event.target.id!=='edit-form')return;event.preventDefault();await performSave(event.target); });
document.addEventListener('input', event => { if(!event.target.closest('#edit-form'))return;
  if (event.target.id === 'reassign-category') return;
  if (event.target.id === 'focus-x' || event.target.id === 'focus-y') updateArtPreview();
  if (event.target.id === 'editorial-focus-x' || event.target.id === 'editorial-focus-y') updateEditorialPhotoPreview();
  if (event.target.id === 'product-focus-x' || event.target.id === 'product-focus-y') updateProductPhotoPreview();
  if (!['art-file','product-photo-file','editorial-photo-file'].includes(event.target.id)) { if(event.target.validity.valid) clearProductError(event.target); markProductDirty(); }
});
$('editor-panel').addEventListener('change', async event => {
  if (event.target.id === 'reassign-category') { event.target.removeAttribute('aria-invalid'); event.target.setAttribute('aria-describedby', 'reassign-help'); $('reassign-error').hidden = true; return; }
  if (event.target.id === 'has-addon') { $('addon-fields').hidden = !event.target.checked; markProductDirty(); }
  if (tab === 'products' && event.target.name === 'category') {
    // Product photography is independent of category artwork.
  }
  if (event.target.name === 'source') updateArtPreview();
  if (event.target.id === 'editorial-photo-file') {
    const file=event.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { notice('La imagen supera 10 MB.',true); return; }
    uploading=true; event.target.disabled=true; markProductDirty();
    try {
      const result=await api('/api/admin/upload',{method:'POST',body:await file.arrayBuffer(),headers:{'content-type':file.type}});
      pendingEditorialPhoto=result.art;
      $('editorial-focus-x').value='50'; $('editorial-focus-y').value='50';
      updateEditorialPhotoPreview(); markProductDirty();
      notice('Fotografía preparada. Guarda la categoría para publicarla en la carta V2.');
    } catch(error) { notice(error.message,true); }
    finally { uploading=false; event.target.disabled=false; markProductDirty(); }
    return;
  }
  if(event.target.id === 'product-photo-file'){
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>10*1024*1024){notice('La imagen supera 10 MB.',true);return;}
    uploading=true;event.target.disabled=true;markProductDirty();
    try{const result=await api('/api/admin/product-image',{method:'POST',body:await file.arrayBuffer(),headers:{'content-type':file.type}});pendingPhoto=result.art;$('product-focus-x').value='50';$('product-focus-y').value='50';updateProductPhotoPreview();markProductDirty();notice('Fotografía preparada. Guarda el producto para publicarla.');}catch(error){notice(error.message,true);}finally{uploading=false;event.target.disabled=false;markProductDirty();}return;
  }
  if (event.target.id !== 'art-file') return;
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) { notice('La imagen supera 10 MB.', true); return; }
  uploading=true;event.target.disabled = true;markProductDirty();notice('Preparando imagen para escritorio y móvil…');
  try {
    const result = await api('/api/admin/upload', { method:'POST', body:await file.arrayBuffer(), headers:{ 'content-type':file.type } });
    pendingArt = result.art; markProductDirty(); $('focus-x').value = '50'; $('focus-y').value = '50'; updateArtPreview();
    notice(`Imagen preparada. Pulsa «${draft?.type === 'category' ? 'Crear categoría' : 'Guardar cambios'}» para usarla en la carta.`);
  } catch (error) { notice(error.message, true); }
  finally { uploading=false;if (event.target.isConnected) event.target.disabled = false;markProductDirty(); }
});
$('editor-panel').addEventListener('click', async event => {
  const target = event.target;
  if(target.id==='remove-product-photo'){pendingPhoto=false;updateProductPhotoPreview();markProductDirty();return;}
  if(target.id==='remove-editorial-photo'){pendingEditorialPhoto=false;updateEditorialPhotoPreview();markProductDirty();return;}
  if (target.closest('[data-discard]')) { pendingArt=undefined;pendingPhoto=undefined;pendingEditorialPhoto=undefined;productFeedback='Cambios descartados.';categoryFeedback=productFeedback;renderEditor();return; }
  if (target.closest('[data-back-to-list]')) {
    if (!await guard()) return;
    draft = null; pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; dirty = false; productFeedback = ''; categoryFeedback = ''; renderEditor(); setWorkspaceView('list', true); return;
  }
  if (target.id === 'add-option') { const list = $('options-list'); list.insertAdjacentHTML('beforeend', optionMarkup(null,list.children.length)); markProductDirty(); }
  if (target.closest('[data-remove-option]')) { target.closest('[data-option]').remove(); markProductDirty(); }
  if (target.closest('[data-cancel]')) {
    if (!await guard()) return;
    draft = null; pendingArt = undefined; pendingPhoto = undefined; pendingEditorialPhoto = undefined; dirty = false; productFeedback = ''; categoryFeedback = ''; renderEditor();
    setWorkspaceView('list', true);
  }
  const deleteButton = target.closest('[data-delete]');
  if (deleteButton) {
    if (dirty && !await guard()) return;
    deleteButton.disabled = true;
    try { const removed = await removeSelected(); if (removed) setWorkspaceView('list', true); } catch (error) { notice(error.message,true); }
    finally { if (deleteButton.isConnected) deleteButton.disabled = false; }
  }
  if (target.id === 'remove-art') { pendingArt = false; markProductDirty(); $('focus-x').value = '50'; $('focus-y').value = '50'; updateArtPreview(); }
  const move = target.closest('[data-move]');
  if (move) { if (dirty && !await guard()) return; try { await moveCategory(Number(move.dataset.move)); } catch (error) { notice(error.message,true); } }
});
window.addEventListener('beforeunload', event => { if (dirty || uploading) { event.preventDefault(); event.returnValue = ''; } });

function renderTools() {
  $('editor-panel').replaceChildren();
  const isPrint=tab==='print', title=isPrint?'Menú impreso':'Promociones';
  $('page-title').textContent=title;$('breadcrumb-current').textContent=title;
  $('page-description').textContent=isPrint?'Una edición de revista, preparada con el catálogo guardado.':'Edita la promoción que aparece al inicio de la carta.';
  $('new-button').hidden=true;
  document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('is-active',button.dataset.tab===tab);button.setAttribute('aria-pressed',String(button.dataset.tab===tab));});
  if(!isPrint){
    const a=catalog.settings?.announcement || {enabled:false,moving:false,es:'',en:''};
    $('tools-panel').innerHTML=`<form id="edit-form" data-kind="content">
      <div class="promotion-editor">
        <section aria-labelledby="promotion-editor-title"><h2 id="promotion-editor-title">Promoción de la carta</h2><p class="tool-intro">Escribe la oferta y sus condiciones. Puedes ocultarla sin borrar el texto.</p>
          <label class="toggle-field"><input type="checkbox" name="enabled" ${a.enabled?'checked':''}> Mostrar promoción en la carta</label>
          <div class="field-grid">${field('Texto en español','es',a.es,{full:true,type:'textarea',max:300})}${field('Texto en inglés','en',a.en,{full:true,type:'textarea',max:300})}</div>
          <p class="helper">Máximo 300 caracteres por idioma. El visitante verá el texto del idioma elegido.</p>
          <details class="promotion-options"><summary>Opciones de presentación</summary><label class="toggle-field"><input type="checkbox" name="moving" ${a.moving?'checked':''}> Desplazamiento suave, con control para pausar</label></details>
        </section>
        <section class="promotion-preview" aria-labelledby="promotion-preview-title"><h3 id="promotion-preview-title">Vista previa</h3><label class="field"><span>Idioma de la vista previa</span><select id="promotion-preview-language" data-preview-only><option value="es">Español</option><option value="en">English</option></select></label><div class="promotion-preview__banner"><strong id="promotion-preview-label">Promociones</strong><p id="promotion-preview-text"></p></div><p id="promotion-preview-state" class="helper"></p><a class="btn" href="../design-lab/journal-fluido.html" target="_blank" rel="noopener">Ver carta ↗</a></section>
      </div>
      <section class="qr-settings"><h3>Enlace público y QR</h3><p class="helper">Guarda la dirección HTTPS de la carta publicada. El QR estará disponible para descargar y aparecerá en las próximas ediciones impresas. Una dirección local no sirve para el público.</p>${field('URL pública de la carta','publicUrl',catalog.settings?.publicUrl || '',{type:'url',full:true,max:2048,placeholder:'https://…'})}${catalog.settings?.publicUrl && document.body.dataset.staticDemo!=='true'?`<a class="btn mt-3" href="/api/admin/menu-qr.svg">Descargar QR en SVG</a><p class="helper">Destino guardado: ${escapeHtml(catalog.settings.publicUrl)}</p>`:''}</section>
      <div class="form-actions"><span class="product-edit-state" role="status">${escapeHtml(categoryFeedback)}</span><button class="primary-button" type="submit">Guardar promoción</button></div></form>`;
    prepareForm();updatePromotionPreview();return;
  }
  $('tools-panel').innerHTML=`<section class="print-workspace"><h2>Ediciones para el local</h2><p class="tool-intro">A4 vertical, con composición propia para imprimir. Toma nombres, descripciones, categorías, variantes y precios del mismo catálogo. Los productos ocultos se excluyen; la disponibilidad de hoy no cambia la edición física.</p><div class="print-controls"><label class="field"><span>Idioma de la edición</span><select id="print-language"><option value="es" ${printLanguage==='es'?'selected':''}>Español</option><option value="en" ${printLanguage==='en'?'selected':''}>English</option></select></label><a class="btn" href="/api/admin/print/preview?lang=${printLanguage}" target="_blank" rel="noopener">Vista previa ↗</a><button id="generate-print" type="button" class="primary-button" disabled>Generar PDF actualizado</button><button id="refresh-print" type="button" class="text-button">Actualizar estado</button></div><p id="print-feedback" role="status" aria-live="polite">Consultando las ediciones…</p><div id="print-status" class="print-status"></div><h3 class="mt-4">Historial de ediciones</h3><ul id="edition-list" class="edition-list"></ul></section>`;
  tablerComponents();refreshPrint();
}
async function refreshPrint() {
  if(document.body.dataset.staticDemo==='true'){
    $('print-feedback').textContent='La demo estática permite probar la edición de carta. La generación y el archivo de PDFs requieren el servidor local de Isabella’s.';
    document.querySelector('.print-controls a').remove();
    $('refresh-print').hidden=true;
    return;
  }
  try{
    const data=await api('/api/admin/print?lang='+printLanguage);if(tab!=='print')return;
    printVersion=data.version;
    $('print-feedback').textContent='';
    $('print-status').textContent=data.current?'El PDF de este idioma está actualizado.':`Pendiente de generar · ${data.changes.added} incorporaciones, ${data.changes.changed} modificaciones y ${data.changes.removed} retiradas desde la última edición.`;
    $('generate-print').disabled=data.current;
    $('edition-list').innerHTML=data.editions.length?data.editions.map(e=>`<li><div><strong>${e.language==='es'?'Español':'English'} · revisión ${e.version}</strong><small>${escapeHtml(new Date(e.createdAt).toLocaleString('es-CR'))} · ${escapeHtml(e.author)}</small><small>${e.current?'Contenido vigente':'Edición anterior · conservada'}</small></div><a class="btn" href="/api/admin/print/${encodeURIComponent(e.id)}.pdf">Descargar PDF</a></li>`).join(''):'<li>Aún no se ha generado ninguna edición.</li>';
  }catch(error){if($('print-feedback'))$('print-feedback').textContent=error.message;}
}
function updatePromotionPreview() {
  const form=$('edit-form');if(form?.dataset.kind!=='content')return;
  const lang=$('promotion-preview-language').value;
  $('promotion-preview-label').textContent=lang==='en'?'Special offers':'Promociones';
  $('promotion-preview-text').textContent=form.elements[lang].value.trim() || (lang==='en'?'Your offer will appear here.':'Aquí aparecerá el texto de tu promoción.');
  $('promotion-preview-state').textContent=form.elements.enabled.checked?'Se mostrará en la carta al guardar.':'Oculta en la carta. Activa «Mostrar promoción» y guarda para publicarla.';
}
$('tools-panel').addEventListener('input',updatePromotionPreview);
$('tools-panel').addEventListener('change',event=>{if(event.target.id==='print-language'){printLanguage=event.target.value;renderTools();}else updatePromotionPreview();});
$('tools-panel').addEventListener('click',async event=>{
  if(event.target.closest('[data-discard]')){renderTools();return;}
  if(event.target.id==='refresh-print'){await refreshPrint();return;}
  if(event.target.id!=='generate-print')return;
  const button=event.target;button.disabled=true;button.textContent='Preparando PDF…';button.setAttribute('aria-busy','true');
  $('print-feedback').textContent='Puedes seguir trabajando cuando termine la generación.';
  try{await api('/api/admin/print',{method:'POST',body:JSON.stringify({version:printVersion,language:printLanguage})});await refreshPrint();if($('print-feedback'))$('print-feedback').textContent='PDF generado. La edición ya está disponible para descargar.';}
  catch(error){if($('print-feedback'))$('print-feedback').textContent=error.message;button.disabled=false;}
  finally{button.textContent='Generar PDF actualizado';button.removeAttribute('aria-busy');}
});

try {
  const session = await api('/api/admin/session'); csrf = session.csrf; role = session.role; permissions = session.permissions || [];
  catalog = await api('/api/admin/menu'); selectedCategory = catalog.categories[0]?.id || null; selectedProduct = catalog.categories.flatMap(category => category.items)[0]?.id || null; showApp();
} catch { showLogin(); }

$('reset-demo').addEventListener('click',async()=>{if(!await guard())return;if(confirm('¿Restablecer esta demostración en este navegador?')){resetDemo();location.reload();}});
