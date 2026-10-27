import { preferredLanguage, journalExperience } from './journal-experience.js?v=e74df35df269';
import { categories as initialCategories, locales, rtlLocales } from '../menu-data.js';
import { createJournalPaginator } from './journal-pages.js?v=e74df35df269';
import { api as demoApi } from '../admin/demo-store.js';

const $ = id => document.getElementById(id);
const proposal = document.body.dataset.proposal;
const imageByCategory = {
  salads: './assets/salad-reference.webp',
  starters: './assets/caprese-reference.webp',
  focaccia: './assets/caprese-reference.webp',
  stromboli: './assets/pasta-reference.webp',
  pasta: './assets/pasta-reference.webp',
  cocktails: './assets/spritz-reference.webp',
};
const copy = {
  es: { skip:'Saltar al contenido', chapters:'Índice de la carta', choose:'Elegir categoría', cover:'Portada', next:'Siguiente', previous:'Anterior', language:'Idioma', browse:'Abrir la carta', issue:'Edición 2026', bookTitle:'Una mesa para quedarse.', bookIntro:'Una carta para hojear con calma. El arte original acompaña cada capítulo; los platos conservan sus nombres, descripciones y precios.', journalTitle:'Historias alrededor de la mesa.', journalIntro:'La cocina italiana de Isabella’s en una lectura de revista: fotografía, ilustración y una carta para consultar a tu ritmo.', chapter:'Capítulo', dishes:n=>`${n} ${n===1?'plato':'platos'}`, page:(n,total)=>`Página ${n} de ${total}`, missing:'Consultar precio', prices:'Precios en colones costarricenses', service:'Precios en colones. Incluyen impuestos; no incluyen 10 % de servicio.', preview:'Prototipo de consulta · sin pedidos ni pagos.', photo:'Fotografía editorial de referencia', original:'Ilustración original del menú', originalCover:'Portada original del menú 2026', empty:'No hay platos visibles en esta categoría.', visual:'Una página para mirar; otra para elegir.' },
  en: { skip:'Skip to content', chapters:'Menu index', choose:'Choose category', cover:'Cover', next:'Next', previous:'Previous', language:'Language', browse:'Open the menu', issue:'2026 edition', bookTitle:'A table to linger at.', bookIntro:'A menu to browse slowly. Original artwork accompanies every chapter; dishes retain their names, descriptions and prices.', journalTitle:'Stories around the table.', journalIntro:'Isabella’s Italian cooking in a journal format: photography, illustration and a menu to explore at your own pace.', chapter:'Chapter', dishes:n=>`${n} ${n===1?'dish':'dishes'}`, page:(n,total)=>`Page ${n} of ${total}`, missing:'Ask for price', prices:'Prices in Costa Rican colones', service:'Prices in colones include tax; 10% service is not included.', preview:'Browse-only prototype · no orders or payments.', photo:'Editorial reference photograph', original:'Original menu artwork', originalCover:'Original 2026 menu cover', empty:'No visible dishes in this category.', visual:'One page to look at; one to choose from.' },
  de: { skip:'Zum Inhalt springen', chapters:'Menüindex', choose:'Kategorie wählen', cover:'Titelseite', next:'Weiter', previous:'Zurück', language:'Sprache', browse:'Speisekarte öffnen', issue:'Ausgabe 2026', bookTitle:'Ein Tisch zum Verweilen.', bookIntro:'Eine Speisekarte zum ruhigen Blättern. Originalillustrationen begleiten jedes Kapitel; Gerichte behalten Namen, Beschreibungen und Preise.', journalTitle:'Geschichten rund um den Tisch.', journalIntro:'Isabellas italienische Küche im Magazinformat: Fotografie, Illustration und eine Speisekarte zum Entdecken.', chapter:'Kapitel', dishes:n=>`${n} ${n===1?'Gericht':'Gerichte'}`, page:(n,total)=>`Seite ${n} von ${total}`, missing:'Preis erfragen', prices:'Preise in Costa-Rica-Colón', service:'Preise in Colón inkl. Steuern; 10 % Service nicht enthalten.', preview:'Prototyp zur Ansicht · keine Bestellungen oder Zahlungen.', photo:'Redaktionelles Referenzfoto', original:'Originalillustration der Speisekarte', originalCover:'Originaltitelbild der Speisekarte 2026', empty:'Keine sichtbaren Gerichte in dieser Kategorie.', visual:'Eine Seite zum Betrachten, eine zum Auswählen.' },
  ar: { skip:'تخط إلى المحتوى', chapters:'فهرس القائمة', choose:'اختر قسماً', cover:'الغلاف', next:'التالي', previous:'السابق', language:'اللغة', browse:'افتح القائمة', issue:'إصدار 2026', bookTitle:'مائدة تستحق البقاء.', bookIntro:'قائمة تتصفحها على مهل. ترافق الرسوم الأصلية كل فصل، مع أسماء الأطباق وأوصافها وأسعارها.', journalTitle:'حكايات حول المائدة.', journalIntro:'المطبخ الإيطالي في إيزابيلا بأسلوب مجلة يجمع التصوير والرسوم وقائمة للقراءة بهدوء.', chapter:'الفصل', dishes:n=>`${n} أطباق`, page:(n,total)=>`الصفحة ${n} من ${total}`, missing:'اسأل عن السعر', prices:'الأسعار بالكولون الكوستاريكي', service:'الأسعار بالكولون وتشمل الضرائب؛ لا تشمل خدمة 10٪.', preview:'نموذج للعرض فقط · دون طلبات أو مدفوعات.', photo:'صورة مرجعية للمجلة', original:'الرسم الأصلي للقائمة', originalCover:'الغلاف الأصلي لقائمة 2026', empty:'لا توجد أطباق ظاهرة في هذا القسم.', visual:'صفحة للنظر وأخرى للاختيار.' },
  he: { skip:'דלג לתוכן', chapters:'תוכן העניינים', choose:'בחרו קטגוריה', cover:'שער', next:'הבא', previous:'הקודם', language:'שפה', browse:'פתחו את התפריט', issue:'מהדורת 2026', bookTitle:'שולחן שכדאי להישאר בו.', bookIntro:'תפריט לדפדוף בקצב שלכם. האיורים המקוריים מלווים כל פרק לצד שמות המנות, התיאורים והמחירים.', journalTitle:'סיפורים סביב השולחן.', journalIntro:'המטבח האיטלקי של איזבלה בפורמט מגזין: צילום, איור ותפריט לעיון רגוע.', chapter:'פרק', dishes:n=>`${n} מנות`, page:(n,total)=>`עמוד ${n} מתוך ${total}`, missing:'יש לברר מחיר', prices:'המחירים בקולון קוסטה ריקני', service:'המחירים בקולון כוללים מסים; אינם כוללים 10% שירות.', preview:'אב טיפוס לעיון בלבד · ללא הזמנות או תשלומים.', photo:'צילום עריכתי להמחשה', original:'איור מקורי מהתפריט', originalCover:'שער התפריט המקורי לשנת 2026', empty:'אין מנות גלויות בקטגוריה זו.', visual:'עמוד אחד למבט, עמוד אחד לבחירה.' },
};
const journalPageNav = { es:'Páginas y categorías', en:'Pages and categories', de:'Seiten und Kategorien', ar:'الصفحات والأقسام', he:'עמודים וקטגוריות' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const rootAsset = path => path?.startsWith('./') ? `../${path.slice(2)}` : path;
const artFor = category => category.art?.src ? rootAsset(category.art.src) : `../assets/menu-art/${category.source.replace(/\.webp$/, '-art.webp')}`;
// Product details use their own verified photograph; category photographs remain editorial.
const photoFor = category => category.editorialPhoto?.src ? rootAsset(category.editorialPhoto.src) : category.art?.src ? rootAsset(category.art.src) : imageByCategory[category.id] || artFor(category);
const mediaCaption = category => category.art?.src && !category.editorialPhoto?.src ? translated(category.title) : category.editorialPhoto?.src || imageByCategory[category.id] ? copy[language].photo : copy[language].original;
const artPosition = category => `${Math.max(0, Math.min(100, Number(category.art?.x ?? 50)))}% ${Math.max(0, Math.min(100, Number(category.art?.y ?? 50)))}%`;
const translated = value => value?.[language] || value?.es || '';
const money = value => `₡${new Intl.NumberFormat('en-US').format(value)}`;
const visibleCategories = () => menuCategories.filter(category => category.visible !== false).map(category => ({ ...category, items:category.items.filter(item => item.visible !== false) }));
const current = () => visibleCategories().find(category => category.id === selected);
const params = new URLSearchParams(location.search);
let menuCategories = initialCategories;
let language = proposal==='journal' ? preferredLanguage(params.get('lang')) : locales.includes(params.get('lang')) ? params.get('lang') : 'es';
let menuSettings={}, printedLanguages=[];
let selected = params.get('category') || 'cover';
let page = Math.max(0, Number.parseInt(params.get('page') || '0', 10) || 0);
let firstRender = true;
const experience = proposal === 'journal' ? journalExperience({getLanguage:()=>language,changeLanguage:value=>{language=value;navigate(selected,page,true);},getItems:()=>visibleCategories().flatMap(c=>c.items),move,priceMarkup,getSettings:()=>menuSettings,getPrinted:()=>printedLanguages}) : null;
const journalPaginator = proposal === 'journal' ? createJournalPaginator({ viewer:$('viewer'), dishMarkup, getLanguage:() => language }) : null;

function priceMarkup(price) {
  return price == null ? `<span class="dish-price dish-price--missing">${escapeHtml(copy[language].missing)}</span>` : `<span class="dish-price"><bdi dir="ltr">${money(price)}</bdi></span>`;
}
function dishMarkup(item) {
  return `<article class="dish-entry" data-dish="${escapeHtml(item.id)}"><div class="dish-entry__top"><h3>${proposal==='journal'&&item.detailEnabled ? `<button class="dish-name-button" type="button" data-open-dish="${escapeHtml(item.id)}">${escapeHtml(translated(item.name))}</button>` : escapeHtml(translated(item.name))}</h3>${item.options?.length ? '' : priceMarkup(item.price)}</div><p>${escapeHtml(translated(item.description))}</p>${proposal==='journal'&&item.available===false?`<p class="dish-unavailable">${language==='en'?'Temporarily unavailable':'No disponible hoy'}</p>`:''}${item.options?.length ? `<div class="dish-extras">${item.options.map(option => `<div><span>${escapeHtml(translated(option.label))}</span>${priceMarkup(option.price)}</div>`).join('')}</div>` : ''}${item.addon ? `<div class="dish-extras"><div><span>${escapeHtml(translated(item.addon.label))}</span>${priceMarkup(item.addon.price)}</div></div>` : ''}</article>`;
}
function bookCover() {
  const t = copy[language];
  const groups = visibleCategories();
  return `<section class="book-stage" aria-label="${escapeHtml(t.cover)}"><div class="book-spread book-cover"><figure class="book-cover__art"><img src="../assets/menu-2026/NEW-MENU-COVER-ISA-2026-A.webp" alt="${escapeHtml(t.originalCover)}" width="912" height="1167" /></figure><div class="book-cover__page"><div class="book-folio"><span>Isabella’s</span><span>${escapeHtml(t.issue)}</span></div><div class="book-cover__body"><p class="small-kicker">Il Libro</p><h1 tabindex="-1">${escapeHtml(t.bookTitle)}</h1><p>${escapeHtml(t.bookIntro)}</p><button class="editorial-action" type="button" data-open-first>${escapeHtml(t.browse)} <span aria-hidden="true">→</span></button></div><div class="book-cover__index"><span>${escapeHtml(t.chapters)}</span><p>${groups.slice(0,4).map(group => escapeHtml(translated(group.title))).join('　/　')}</p></div></div></div></section>`;
}
function bookCategory(category) {
  const t = copy[language];
  const total = Math.max(1, Math.ceil(category.items.length / 4));
  page = Math.min(page, total - 1);
  const items = category.items.slice(page * 4, page * 4 + 4);
  return `<section class="book-stage" aria-labelledby="book-title"><div class="book-spread book-content"><div class="book-art-page"><img src="${escapeHtml(artFor(category))}" style="object-position:${artPosition(category)}" alt="" /><div class="book-art-page__label"><p>${escapeHtml(t.chapter)} ${String(visibleCategories().findIndex(group => group.id === category.id) + 1).padStart(2,'0')}</p><h1 id="book-title" tabindex="-1">${escapeHtml(translated(category.title))}</h1></div><span class="book-art-page__folio">Isabella’s · 2026</span></div><div class="book-reading-page"><div class="book-folio"><span>${escapeHtml(t.chapter)} ${String(visibleCategories().findIndex(group => group.id === category.id) + 1).padStart(2,'0')}</span><span>${escapeHtml(t.page(page + 1,total))}</span></div><header class="book-reading-page__header"><p class="small-kicker">${escapeHtml(t.visual)}</p><h2>${escapeHtml(translated(category.title))}</h2><span>${escapeHtml(t.dishes(category.items.length))}</span></header><div class="book-dishes">${items.length ? items.map(dishMarkup).join('') : `<p>${escapeHtml(t.empty)}</p>`}</div><div class="book-reading-page__foot"><span>${escapeHtml(t.prices)}</span><span><bdi dir="ltr">${String(page+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</bdi></span></div></div></div></section>`;
}
function journalCover() {
  const t = copy[language];
  const pasta = visibleCategories().find(category => category.id === 'pasta');
  return `<section class="journal-cover" aria-label="${escapeHtml(t.cover)}"><div class="journal-cover__intro"><div class="journal-masthead"><span>Isabella’s</span><span>${escapeHtml(t.issue)}</span></div><div class="journal-cover__headline"><p class="small-kicker">Isabella’s Journal</p><h1 tabindex="-1">${escapeHtml(t.journalTitle)}</h1><p>${escapeHtml(t.journalIntro)}</p><button class="editorial-action" type="button" data-open-first>${escapeHtml(t.browse)} <span aria-hidden="true">→</span></button></div><div class="journal-cover__original"><img src="../assets/menu-2026/NEW-MENU-COVER-ISA-2026-A.webp" alt="${escapeHtml(t.originalCover)}" width="912" height="1167" /><span>${escapeHtml(t.original)}</span></div></div><figure class="journal-cover__photo"><img src="${escapeHtml(pasta ? photoFor(pasta) : imageByCategory.pasta)}" alt="${escapeHtml(t.photo)}" /><figcaption>${escapeHtml(t.photo)}</figcaption></figure></section>`;
}
function journalCategory(category) {
  const t = copy[language];
  const index = visibleCategories().findIndex(group => group.id === category.id);
  const pages = journalPaginator.paginate(category);
  page = Math.min(page, pages.length - 1);
  const currentPage = pages[page];
  const chapterNumber = String(index + 1).padStart(2, '0');
  const folio = `<bdi dir="ltr">${String(page + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}</bdi>`;
  const chapter = `${escapeHtml(t.chapter)} ${chapterNumber}`;
  const name = escapeHtml(translated(category.title));
  const footer = `<footer class="journal-sheet__footer"><span>Isabella’s Journal · ${chapter}</span><span>${folio}</span></footer>`;

  if (currentPage.kind === 'photo') {
    return `<section class="journal-category journal-category--${index % 2 ? 'reverse' : 'forward'}" data-chapter="${escapeHtml(category.id)}" data-page="${page + 1}" data-page-count="${pages.length}" aria-labelledby="journal-title"><div class="journal-category__heading"><p>Isabella’s Journal <span>${chapter}</span></p><h1 id="journal-title" tabindex="-1">${name}</h1><span class="journal-category__count">${escapeHtml(t.dishes(category.items.length))}</span><span class="journal-category__folio">${folio}</span></div><div class="journal-opening"><figure class="journal-photo"><img src="${escapeHtml(photoFor(category))}" alt="${escapeHtml(mediaCaption(category))}" /><figcaption>${escapeHtml(mediaCaption(category))}</figcaption></figure><div class="journal-reading"><div class="journal-reading__meta"><span>${chapter}</span><span>${escapeHtml(t.prices)}</span></div><div class="journal-page__dishes">${currentPage.columns[0].length ? currentPage.columns[0].map(dishMarkup).join('') : category.items.length ? '' : `<p>${escapeHtml(t.empty)}</p>`}</div></div></div>${footer}</section>`;
  }

  return `<section class="journal-sheet journal-sheet--type" data-chapter="${escapeHtml(category.id)}" data-page="${page + 1}" data-page-count="${pages.length}" aria-labelledby="journal-title"><div class="journal-sheet__topline"><span>Isabella’s Journal · ${chapter}</span><span>${folio}</span></div><header class="journal-sheet__heading"><p>${chapter}</p><h1 id="journal-title" tabindex="-1">${name}</h1><span>${escapeHtml(t.prices)}</span></header><div class="journal-sheet__columns">${currentPage.columns.map(items => `<div class="journal-page__dishes">${items.map(dishMarkup).join('')}</div>`).join('')}</div>${footer}</section>`;
}
function steps() {
  const groups = visibleCategories();
  return [{category:'cover',page:0}, ...groups.flatMap(category => Array.from({length:proposal === 'libro' ? Math.max(1,Math.ceil(category.items.length/4)) : journalPaginator.paginate(category).length}, (_,index) => ({category:category.id,page:index})))];
}
function renderNavigation() {
  const t = copy[language];
  const groups = visibleCategories();
  const chapterButtons = `<button type="button" data-category="cover" ${selected === 'cover' ? 'aria-current="page"' : ''}>${escapeHtml(t.cover)}</button>${groups.map((category,index) => `<button type="button" data-category="${escapeHtml(category.id)}" ${selected === category.id ? 'aria-current="page"' : ''}><span>${String(index+1).padStart(2,'0')}</span>${escapeHtml(translated(category.title))}</button>`).join('')}`;
  $('chapter-nav').innerHTML = chapterButtons;
  if (proposal === 'journal') {
    $('reader-index-list').innerHTML = chapterButtons;
    $('reader-index-title').textContent = t.chapters;
    $('reader-index-close').setAttribute('aria-label', language === 'en' ? 'Close menu index' : 'Cerrar índice');
    $('reader-index-current').textContent = `${t.chapters} · ${selected === 'cover' ? t.cover : translated(current()?.title)}`;
  }
  $('chapter-select').innerHTML = `<option value="cover">${escapeHtml(t.cover)}</option>${groups.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(translated(category.title))}</option>`).join('')}`;
  $('chapter-select').value = selected;
  $('chapter-nav').setAttribute('aria-label',t.chapters);
}
function render() {
  const t = copy[language];
  document.documentElement.lang = language;
  document.documentElement.dir = rtlLocales.has(language) ? 'rtl' : 'ltr';
  document.querySelector('.skip-link').textContent = t.skip;
  $('language-label').textContent = t.language;
  $('language-select').value = language;
  $('chapters-label').textContent = t.chapters;
  $('chapter-select-label').textContent = t.choose;
  $('page-prev-label').textContent = t.previous;
  $('page-next-label').textContent = t.next;
  $('page-prev').querySelector('[aria-hidden]').textContent = rtlLocales.has(language) ? '→' : '←';
  $('page-next').querySelector('[aria-hidden]').textContent = rtlLocales.has(language) ? '←' : '→';
  $('page-position').setAttribute('dir', 'ltr');
  if (proposal === 'journal') $('page-controls').setAttribute('aria-label', journalPageNav[language]);
  $('service-note').textContent = t.service;
  $('preview-note').textContent = t.preview;
  if (!current() && selected !== 'cover') { selected = 'cover'; page = 0; }
  const comparison = new URL(`./${proposal === 'libro' ? 'journal' : 'il-libro'}.html`, location.href);
  if (selected !== 'cover') comparison.searchParams.set('category', selected);
  comparison.searchParams.set('lang', language);
  document.querySelector('.lab-links a').href = comparison;
  const draft = new URL('../borrador-1.html', location.href);
  draft.searchParams.set('lang', language);
  document.querySelector('.lab-links a:last-child').href = draft;
  if (proposal === 'journal') {
    $('reader-comparison').href = comparison;
    $('reader-draft').href = draft;
  }
  renderNavigation();
  const requestedPage = page;
  $('viewer').innerHTML = selected === 'cover' ? (proposal === 'libro' ? bookCover() : journalCover()) : (proposal === 'libro' ? bookCategory(current()) : journalCategory(current()));
  if (proposal === 'journal' && requestedPage !== page) {
    const canonical = new URL(location.href);
    if (page) canonical.searchParams.set('page', String(page));
    else canonical.searchParams.delete('page');
    history.replaceState({}, '', canonical);
  }
  const all = steps();
  const position = Math.max(0, all.findIndex(step => step.category === selected && step.page === page));
  $('page-position').textContent = `${String(position+1).padStart(2,'0')} / ${String(all.length).padStart(2,'0')}`;
  $('page-prev').disabled = position === 0;
  $('page-next').disabled = position === all.length - 1;
  if (!firstRender) {
    if (proposal !== 'journal' || innerWidth > 760) $('viewer').scrollIntoView({ block:'start', behavior:'instant' });
    $('viewer').querySelector('h1')?.focus({preventScroll:true});
  }
  firstRender = false;
  experience?.render();
}
function navigate(category, nextPage = 0, replace = false) {
  selected = category;
  page = nextPage;
  const url = new URL(location.href);
  url.searchParams.delete('category'); url.searchParams.delete('page'); url.searchParams.delete('view');
  if (selected !== 'cover') { url.searchParams.set('category',selected); if (page) url.searchParams.set('page',String(page)); }
  else url.searchParams.set('view','cover');
  url.searchParams.set('lang',language);
  history[replace ? 'replaceState' : 'pushState']({},'',url);
  render();
}
function move(delta) {
  const all = steps();
  const position = all.findIndex(step => step.category === selected && step.page === page);
  const next = all[position + delta];
  if (next) navigate(next.category,next.page);
}
document.addEventListener('click', event => {
  if (event.target.closest('.lab-logo')) { event.preventDefault(); navigate('cover'); return; }
  const category = event.target.closest('[data-category]');
  if (category) { if (proposal === 'journal' && $('reader-index').open) $('reader-index').close(); navigate(category.dataset.category); }
  if (event.target.closest('[data-open-first]')) navigate(visibleCategories()[0]?.id || 'cover');
});
if (proposal === 'journal') {
  $('reader-index-toggle').addEventListener('click', () => $('reader-index').showModal());
  $('reader-index-close').addEventListener('click', () => { $('reader-index').close(); $('reader-index-toggle').focus({ preventScroll:true }); });
  $('reader-index').addEventListener('click', event => { if (event.target === $('reader-index')) $('reader-index').close(); });
  $('reader-index').addEventListener('close', () => $('reader-index-toggle').focus({ preventScroll:true }));
}
$('chapter-select').addEventListener('change', event => navigate(event.target.value));
$('language-select').addEventListener('change', event => { language = event.target.value; navigate(selected,page,true); });
$('page-prev').addEventListener('click', () => move(-1));
$('page-next').addEventListener('click', () => move(1));
document.addEventListener('keydown', event => {
  if (experience?.isOpen() || !['ArrowLeft','ArrowRight'].includes(event.key) || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  const forward = rtlLocales.has(language) ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
  move(forward ? 1 : -1);
});
window.addEventListener('popstate', () => {
  const query = new URLSearchParams(location.search);
  language = proposal==='journal' ? preferredLanguage(query.get('lang')) : locales.includes(query.get('lang')) ? query.get('lang') : 'es';
  selected = query.get('category') || 'cover';
  page = Math.max(0, Number.parseInt(query.get('page') || '0',10) || 0);
  render();
});

let catalogVersion = null;
async function refreshCatalog() {
  try {
    const data = await demoApi('/api/admin/menu');
    if (!Array.isArray(data.categories)) return;
    const changed = catalogVersion !== null && data.version !== catalogVersion;
    menuCategories = data.categories;
    catalogVersion = data.version;
    menuSettings=data.settings || {};printedLanguages=data.printed || [];experience?.render();
    if (changed && proposal === 'journal') {
      journalPaginator.clear();
      firstRender = true;
      render();
    }
  } catch { /* The versioned local catalog keeps the menu usable offline. */ }
}
await refreshCatalog();
if (proposal === 'journal') await document.fonts.ready;
render();
if (proposal === 'journal') {
  window.addEventListener('focus', refreshCatalog);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCatalog(); });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      journalPaginator.clear();
      const category = current();
      if (category) page = Math.min(page, journalPaginator.paginate(category).length - 1);
      firstRender = true;
      navigate(selected, page, true);
    }, 120);
  });
}
