import { categories, locales, rtlLocales } from './menu-data.js';
let menuCategories = categories;
const translated = value => value?.[language] || value?.es || '';

const copy = {
  es: {
    skip: 'Saltar al menú', preview: 'Vista previa A · Isabella’s', navMenu: 'El menú', navAbout: 'Origen', navLabel: 'Navegación principal', brandLabel: 'Isabella’s · inicio', language: 'Idioma',
    kicker: 'La carta de Isabella’s', heroTitle: 'Un gusto por quedarse.', heroDescription: 'Sabores italianos, mesa compartida y buenos momentos. Descubre nuestra carta a tu ritmo.', heroCta: 'Explorar el menú', heroSource: 'Basado en el menú oficial de 2026.',
    menuTitle: 'Nuestra carta', menuSubtitle: 'Elige una categoría o busca un plato.', edition: 'Edición 2026', searchLabel: 'Buscar platos', searchPlaceholder: 'Buscar platos o ingredientes', categories: 'Categorías', categoriesLabel: 'Categorías del menú',
    result: n => `${n} ${n === 1 ? 'plato' : 'platos'}`, unlisted: 'Consultar precio', price: 'Precio', emptyTitle: 'No encontramos platos', emptyCopy: 'Prueba otra palabra o elige una categoría.', readerKicker: 'EL LIBRO · 2026', originalPage: 'Página original en español', openOriginal: 'Ver página original', chapter: 'Capítulo', previous: 'Anterior', next: 'Siguiente', readerHint: 'Desliza o usa las flechas para pasar las páginas.',
    aboutTitle: 'El menú de Isabella’s, en tu idioma.', aboutCopy: 'La página ilustrada conserva el arte de la carta, sin texto ni precios. La página de lectura muestra los platos y sus importes en tu idioma; los precios ausentes en el original quedan pendientes.', service: 'Los precios incluyen el impuesto de venta. No incluyen 10 % de servicio.', sourceLink: 'Ver menú original', pagesSummary: 'Comparar las nueve páginas originales', pagesNote: 'Las imágenes originales están en español.', page: n => `Página ${n}`, pricesOriginal: 'Precios en colones costarricenses', footer: 'Carta de consulta · Sin pedidos en línea',
  },
  en: {
    skip: 'Skip to the menu', preview: 'Preview A · Isabella’s', navMenu: 'The menu', navAbout: 'Source', navLabel: 'Main navigation', brandLabel: 'Isabella’s · home', language: 'Language',
    kicker: 'Isabella’s menu', heroTitle: 'A taste worth lingering over.', heroDescription: 'Italian flavors, shared tables and good moments. Explore our menu at your own pace.', heroCta: 'Explore the menu', heroSource: 'Based on the official 2026 menu.',
    menuTitle: 'Our menu', menuSubtitle: 'Choose a category or search for a dish.', edition: '2026 edition', searchLabel: 'Search dishes', searchPlaceholder: 'Search dishes or ingredients', categories: 'Categories', categoriesLabel: 'Menu categories',
    result: n => `${n} ${n === 1 ? 'dish' : 'dishes'}`, unlisted: 'Ask for price', price: 'Price', emptyTitle: 'No dishes found', emptyCopy: 'Try another word or choose a category.', readerKicker: 'THE BOOK · 2026', originalPage: 'Original page in Spanish', openOriginal: 'View original page', chapter: 'Chapter', previous: 'Previous', next: 'Next', readerHint: 'Swipe or use the arrows to turn the pages.',
    aboutTitle: 'Isabella’s menu, in your language.', aboutCopy: 'The illustrated page keeps the menu artwork without text or prices. The reading page shows dishes and prices in your language; prices absent from the original remain pending.', service: 'Prices include sales tax. A 10% service charge is not included.', sourceLink: 'View original menu', pagesSummary: 'Compare the nine original pages', pagesNote: 'The original pages are in Spanish.', page: n => `Page ${n}`, pricesOriginal: 'Prices in Costa Rican colones', footer: 'Browse-only menu · No online ordering',
  },
  de: {
    skip: 'Zum Menü springen', preview: 'Vorschau A · Isabella’s', navMenu: 'Speisekarte', navAbout: 'Quelle', navLabel: 'Hauptnavigation', brandLabel: 'Isabella’s · Startseite', language: 'Sprache',
    kicker: 'Isabella’s Speisekarte', heroTitle: 'Genuss, der zum Bleiben einlädt.', heroDescription: 'Italienische Aromen, gemeinsames Essen und schöne Momente. Entdecken Sie unsere Karte in Ihrem Tempo.', heroCta: 'Speisekarte entdecken', heroSource: 'Basierend auf der offiziellen Speisekarte 2026.',
    menuTitle: 'Unsere Speisekarte', menuSubtitle: 'Wählen Sie eine Kategorie oder suchen Sie ein Gericht.', edition: 'Ausgabe 2026', searchLabel: 'Gerichte suchen', searchPlaceholder: 'Gerichte oder Zutaten suchen', categories: 'Kategorien', categoriesLabel: 'Menükategorien',
    result: n => `${n} ${n === 1 ? 'Gericht' : 'Gerichte'}`, unlisted: 'Preis erfragen', price: 'Preis', emptyTitle: 'Keine Gerichte gefunden', emptyCopy: 'Versuchen Sie ein anderes Wort oder wählen Sie eine Kategorie.', readerKicker: 'DAS BUCH · 2026', originalPage: 'Originalseite auf Spanisch', openOriginal: 'Originalseite ansehen', chapter: 'Kapitel', previous: 'Zurück', next: 'Weiter', readerHint: 'Wischen oder mit den Pfeilen weiterblättern.',
    aboutTitle: 'Isabella’s Speisekarte in Ihrer Sprache.', aboutCopy: 'Die Bildseite zeigt die Gestaltung der Karte ohne Text und Preise. Auf der Leseseite stehen Gerichte und Preise in Ihrer Sprache; im Original fehlende Preise bleiben offen.', service: 'Die Preise enthalten die Umsatzsteuer. 10 % Servicegebühr sind nicht enthalten.', sourceLink: 'Originalkarte ansehen', pagesSummary: 'Die neun Originalseiten vergleichen', pagesNote: 'Die Originalseiten sind auf Spanisch.', page: n => `Seite ${n}`, pricesOriginal: 'Preise in Costa-Rica-Colón', footer: 'Speisekarte zur Ansicht · Keine Online-Bestellung',
  },
  ar: {
    skip: 'تخطي إلى القائمة', preview: 'معاينة أ · إيزابيلا', navMenu: 'القائمة', navAbout: 'المصدر', navLabel: 'التنقل الرئيسي', brandLabel: 'إيزابيلا · الرئيسية', language: 'اللغة',
    kicker: 'قائمة إيزابيلا', heroTitle: 'مذاق يدعوك للبقاء.', heroDescription: 'نكهات إيطالية ولحظات جميلة حول المائدة. اكتشف قائمتنا على مهل.', heroCta: 'استكشف القائمة', heroSource: 'استنادًا إلى القائمة الرسمية لعام 2026.',
    menuTitle: 'قائمتنا', menuSubtitle: 'اختر قسمًا أو ابحث عن طبق.', edition: 'إصدار 2026', searchLabel: 'ابحث عن الأطباق', searchPlaceholder: 'ابحث عن طبق أو مكون', categories: 'الأقسام', categoriesLabel: 'أقسام القائمة',
    result: n => `${n} طبق`, unlisted: 'اسأل عن السعر', price: 'السعر', emptyTitle: 'لم نعثر على أطباق', emptyCopy: 'جرّب كلمة أخرى أو اختر قسمًا.', readerKicker: 'الكتاب · 2026', originalPage: 'الصفحة الأصلية بالإسبانية', openOriginal: 'عرض الصفحة الأصلية', chapter: 'الفصل', previous: 'السابق', next: 'التالي', readerHint: 'اسحب أو استخدم الأسهم لتقليب الصفحات.',
    aboutTitle: 'قائمة إيزابيلا بلغتك.', aboutCopy: 'تحافظ الصفحة المصورة على فن القائمة بلا أسماء أطباق أو أسعار. تعرض صفحة القراءة الأطباق وأسعارها بلغتك، وتبقى الأسعار غير الموجودة في الأصل قيد التحقق.', service: 'الأسعار تشمل ضريبة المبيعات. لا تشمل رسوم الخدمة البالغة 10٪.', sourceLink: 'اعرض القائمة الأصلية', pagesSummary: 'قارن الصفحات الأصلية التسع', pagesNote: 'الصفحات الأصلية باللغة الإسبانية.', page: n => `الصفحة ${n}`, pricesOriginal: 'الأسعار بالكولون الكوستاريكي', footer: 'قائمة للاطلاع فقط · لا يوجد طلب عبر الإنترنت',
  },
  he: {
    skip: 'דלג לתפריט', preview: 'תצוגה מקדימה א · איזבלה', navMenu: 'התפריט', navAbout: 'מקור', navLabel: 'ניווט ראשי', brandLabel: 'איזבלה · דף הבית', language: 'שפה',
    kicker: 'התפריט של איזבלה', heroTitle: 'טעם שכדאי להישאר בשבילו.', heroDescription: 'טעמים איטלקיים ורגעים טובים סביב השולחן. גלו את התפריט בקצב שלכם.', heroCta: 'לגלות את התפריט', heroSource: 'מבוסס על התפריט הרשמי לשנת 2026.',
    menuTitle: 'התפריט שלנו', menuSubtitle: 'בחרו קטגוריה או חפשו מנה.', edition: 'מהדורת 2026', searchLabel: 'חיפוש מנות', searchPlaceholder: 'חיפוש מנה או מרכיב', categories: 'קטגוריות', categoriesLabel: 'קטגוריות התפריט',
    result: n => `${n} ${n === 1 ? 'מנה' : 'מנות'}`, unlisted: 'יש לברר מחיר', price: 'מחיר', emptyTitle: 'לא נמצאו מנות', emptyCopy: 'נסו מילה אחרת או בחרו קטגוריה.', readerKicker: 'הספר · 2026', originalPage: 'עמוד מקורי בספרדית', openOriginal: 'הצגת העמוד המקורי', chapter: 'פרק', previous: 'הקודם', next: 'הבא', readerHint: 'החליקו או השתמשו בחצים כדי לדפדף.',
    aboutTitle: 'התפריט של איזבלה, בשפה שלכם.', aboutCopy: 'העמוד המאויר שומר על אמנות התפריט בלי שמות מנות או מחירים. בעמוד הקריאה מופיעים המנות והמחירים בשפתכם; מחירים שחסרים במקור עדיין טעונים בדיקה.', service: 'המחירים כוללים מס מכירה. דמי שירות של 10% אינם כלולים.', sourceLink: 'לתפריט המקורי', pagesSummary: 'השוו את תשעת העמודים המקוריים', pagesNote: 'העמודים המקוריים בספרדית.', page: n => `עמוד ${n}`, pricesOriginal: 'מחירים בקולון קוסטה ריקני', footer: 'תפריט לעיון בלבד · ללא הזמנות מקוונות',
  },
};

const $ = id => document.getElementById(id);
const sourcePages = ['NEW-MENU-COVER-ISA-2026-A.webp', '1-PRE.webp', '2-PRE.webp', '7-PRE.webp', 'ALL-4-D.webp', '4-PRE.webp', 'ALL-4-C.webp', 'ALL-4-A.webp', 'ALL-4-B.webp'];
const artImagePath = source => `./assets/menu-art/${source.replace(/\.webp$/, '-art.webp')}`;
const warmedImages = new Map();
const warmImage = (source, category) => {
  if (!source) return;
  const path = category?.art?.src || artImagePath(source);
  if (warmedImages.has(path)) return;
  const image = new Image();
  image.decoding = 'async';
  image.src = path;
  warmedImages.set(path, image);
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const supported = value => {
  if (!value) return null;
  const primary = String(value).toLowerCase().split(/[-_]/)[0];
  const locale = primary === 'iw' ? 'he' : primary;
  return locales.includes(locale) ? locale : null;
};
const fromStorage = () => { try { return supported(localStorage.getItem('isabellas-menu-language')); } catch { return null; } };
const preferredLanguage = () => {
  const parameter = supported(new URLSearchParams(location.search).get('lang'));
  if (parameter) return parameter;
  const saved = fromStorage();
  if (saved) return saved;
  for (const language of navigator.languages ?? [navigator.language]) {
    const locale = supported(language);
    if (locale) return locale;
  }
  return 'es';
};

let language = preferredLanguage();
let query = '';
let spreads = [];
let activeSpread = 0;
let turning = false;
let turnVersion = 0;
let turnTimer;
let turningTo = null;
let pendingTurn = null;
const money = amount => `₡${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
const priceMarkup = (amount, option = false) => amount == null
  ? `<span class="dish-price dish-price--unlisted${option ? ' dish-price--option' : ''}">${escapeHtml(copy[language].unlisted)}</span>`
  : `<span class="dish-price${option ? ' dish-price--option' : ''}" aria-label="${escapeHtml(copy[language].price)}: ${money(amount)}"><bdi dir="ltr">${money(amount)}</bdi></span>`;

function renderText() {
  const t = copy[language];
  document.documentElement.lang = language;
  document.documentElement.dir = rtlLocales.has(language) ? 'rtl' : 'ltr';
  document.title = `Isabella’s · ${t.menuTitle} · Preview A`;
  const ids = {
    'skip-link': t.skip, 'preview-label': t.preview, 'nav-menu': t.navMenu, 'nav-about': t.navAbout,
    'language-label': t.language, 'hero-kicker': t.kicker, 'hero-title': t.heroTitle,
    'hero-description': t.heroDescription, 'hero-source': t.heroSource, 'menu-title': t.menuTitle,
    'menu-subtitle': t.menuSubtitle, 'menu-edition': t.edition, 'search-label': t.searchLabel,
    'category-title': t.categories, 'about-title': t.aboutTitle, 'about-copy': t.aboutCopy,
    'service-note': t.service, 'source-pages-summary': t.pagesSummary, 'source-pages-note': t.pagesNote, 'footer-note': t.footer,
    'reader-kicker': t.readerKicker, 'reader-prev-text': t.previous, 'reader-next-text': t.next, 'reader-hint': t.readerHint,
  };
  for (const [id, value] of Object.entries(ids)) $(id).textContent = value;
  $('hero-cta').firstChild.textContent = `${t.heroCta} `;
  $('source-link').firstChild.textContent = `${t.sourceLink} `;
  $('menu-search').placeholder = t.searchPlaceholder;
  $('menu-search').setAttribute('dir', 'auto');
  document.querySelector('.header-nav').setAttribute('aria-label', t.navLabel);
  document.querySelector('.brand').setAttribute('aria-label', t.brandLabel);
  $('category-nav').setAttribute('aria-label', t.categoriesLabel);
  $('magazine-reader').setAttribute('aria-label', t.menuTitle);
  $('language-select').value = language;
  $('language-select').setAttribute('aria-label', t.language);
  $('source-pages-grid').innerHTML = sourcePages.map((file, index) => `<a href="./assets/menu-2026/${file}" target="_blank" rel="noopener noreferrer"><img src="./assets/menu-2026/${file}" loading="lazy" alt="" width="130" height="170" /><span>${escapeHtml(t.page(index + 1))}</span></a>`).join('');
}

function spreadMarkup(spread, index) {
  const t = copy[language];
  const { category, items, source } = spread;
  const chapterNumber = String(category.index + 1).padStart(2, '0');
  const originalNumber = sourcePages.indexOf(source) + 1;
  const current = String(index + 1).padStart(2, '0');
  const total = String(spreads.length).padStart(2, '0');
  const art = category.art;
  const artSrc = art?.src || artImagePath(source);
  const artSrcset = art?.srcSmall ? ` srcset="${escapeHtml(art.srcSmall)} 800w, ${escapeHtml(art.src)} 1600w" sizes="(max-width: 900px) 100vw, 50vw"` : '';
  const artPosition = art ? ` style="object-position: ${Number(art.x)}% ${Number(art.y)}%"` : '';
  return `
    <section class="magazine-spread" id="category-${escapeHtml(category.id)}" aria-labelledby="heading-${escapeHtml(category.id)}" data-source-page="${originalNumber}">
      <div class="magazine-art-page">
        <div class="art-page-top"><span>ISABELLA’S · 2026</span><span>${escapeHtml(t.page(originalNumber))}</span></div>
        <a class="art-page-image" href="./assets/menu-2026/${source}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t.originalPage)} · ${escapeHtml(t.page(originalNumber))}">
          <img src="${escapeHtml(artSrc)}"${artSrcset}${artPosition} alt="" loading="eager" />
        </a>
        <a class="art-page-bottom" href="./assets/menu-2026/${source}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(t.openOriginal)}</span><span aria-hidden="true">↗</span></a>
      </div>
      <div class="magazine-content-page">
        <div class="content-page-top"><span>ISABELLA’S</span><span>${escapeHtml(t.edition)}</span></div>
        <div class="chapter-heading"><span class="chapter-number">${chapterNumber}</span><div><p>${escapeHtml(t.chapter)} ${chapterNumber}</p><h3 id="heading-${escapeHtml(category.id)}">${escapeHtml(translated(category.title))}</h3></div></div>
        <div class="page-dishes">${items.map(item => `
          <article class="dish" data-item="${escapeHtml(item.id)}">
            <div class="dish-heading"><h4>${escapeHtml(translated(item.name))}</h4>${item.options?.length ? '' : priceMarkup(item.price)}</div>
            <p class="dish-description">${escapeHtml(translated(item.description))}</p>
            ${item.addon ? `<div class="dish-options"><span class="dish-option"><span>${escapeHtml(translated(item.addon.label))}</span>${priceMarkup(item.addon.price, true)}</span></div>` : ''}
            ${item.options?.length ? `<div class="dish-options">${item.options.map(option => `<span class="dish-option"><span>${escapeHtml(translated(option.label))}</span>${priceMarkup(option.price, true)}</span>`).join('')}</div>` : ''}
          </article>`).join('')}</div>
        <div class="content-page-bottom"><span>${escapeHtml(t.pricesOriginal)}</span><span dir="ltr">${current} / ${total}</span></div>
      </div>
    </section>`;
}

function renderSpread() {
  const t = copy[language];
  const spread = spreads[activeSpread];
  $('reader-controls').hidden = !spread;
  $('reader-hint').hidden = !spread;
  if (!spread) {
    $('reader-counter').textContent = '';
    $('reader-announcement').textContent = t.emptyTitle;
    $('reader-progress-fill').style.width = '0%';
    $('menu-list').innerHTML = `<div class="empty-state" role="status"><h3>${escapeHtml(t.emptyTitle)}</h3><p>${escapeHtml(t.emptyCopy)}</p></div>`;
    return;
  }
  const { category } = spread;
  const current = String(activeSpread + 1).padStart(2, '0');
  const total = String(spreads.length).padStart(2, '0');
  $('reader-counter').textContent = `${current} / ${total}`;
  $('reader-announcement').textContent = `${translated(category.title)}. ${t.page(activeSpread + 1)} / ${spreads.length}.`;
  $('reader-progress-fill').style.width = `${((activeSpread + 1) / spreads.length) * 100}%`;
  $('reader-prev').disabled = activeSpread === 0;
  $('reader-next').disabled = activeSpread === spreads.length - 1;
  for (const button of $('category-nav').querySelectorAll('button')) {
    if (button.dataset.category === category.id) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('menu-list').innerHTML = spreadMarkup(spread, activeSpread);
  for (const neighbor of [spreads[activeSpread - 1], spreads[activeSpread + 1]]) {
    if (neighbor?.source !== spread.source || neighbor?.category?.art?.src !== spread.category.art?.src) warmImage(neighbor?.source, neighbor?.category);
  }
}

function renderMenu(preferredCategory) {
  turnVersion++;
  turning = false;
  turningTo = null;
  pendingTurn = null;
  clearTimeout(turnTimer);
  $('menu-list').removeAttribute('aria-busy');
  const t = copy[language];
  const needle = normalize(query.trim());
  const groups = menuCategories.filter(category => category.visible !== false).map((category, index) => ({
    ...category,
    index,
    visible: category.items.filter(item => item.visible !== false && (!needle || normalize(`${translated(category.title)} ${translated(item.name)} ${translated(item.description)}`).includes(needle))),
  })).filter(group => group.visible.length);
  $('result-count').textContent = t.result(groups.reduce((count, group) => count + group.visible.length, 0));
  $('category-nav').innerHTML = groups.map(group => `<button class="category-link" type="button" data-category="${escapeHtml(group.id)}"><span>${escapeHtml(translated(group.title))}</span><small>${group.visible.length}</small></button>`).join('');
  spreads = [];
  for (const category of groups) {
    const runs = [];
    for (const item of category.visible) {
      const source = item.source ?? category.source;
      if (runs.at(-1)?.source !== source) runs.push({ source, items: [] });
      runs.at(-1).items.push(item);
    }
    for (const run of runs) {
      const pageCount = Math.ceil(run.items.length / 5);
      const base = Math.floor(run.items.length / pageCount);
      const extra = run.items.length % pageCount;
      let offset = 0;
      for (let page = 0; page < pageCount; page++) {
        const size = base + (page < extra ? 1 : 0);
        spreads.push({ category, source: run.source, items: run.items.slice(offset, offset + size) });
        offset += size;
      }
    }
  }
  activeSpread = preferredCategory ? Math.max(0, spreads.findIndex(spread => spread.category.id === preferredCategory)) : Math.min(activeSpread, Math.max(0, spreads.length - 1));
  renderSpread();
}

function cloneForTurn(element) {
  const clone = element.cloneNode(true);
  for (const node of [clone, ...clone.querySelectorAll('[id]')]) node.removeAttribute('id');
  clone.removeAttribute('aria-labelledby');
  return clone;
}

function turnTo(index) {
  if (index < 0 || index >= spreads.length) return;
  if (turning) { pendingTurn = index; return; }
  if (index === activeSpread) return;
  const reader = $('magazine-reader');
  const list = $('menu-list');
  const oldSpread = list.querySelector('.magazine-spread');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reader.scrollIntoView({ behavior: 'instant', block: 'start' }); }
  catch { reader.scrollIntoView({ behavior: 'auto', block: 'start' }); }
  if (reduced || !oldSpread) {
    activeSpread = index;
    renderSpread();
    return;
  }

  const forward = index > activeSpread;
  const rtl = rtlLocales.has(language);
  const rightHalf = forward !== rtl;
  const compact = matchMedia('(max-width: 900px)').matches;
  const duration = compact ? 540 : 680;
  const template = document.createElement('template');
  template.innerHTML = spreadMarkup(spreads[index], index).trim();
  const nextSpread = template.content.firstElementChild;
  const oldArt = oldSpread.querySelector('.magazine-art-page');
  const oldContent = oldSpread.querySelector('.magazine-content-page');
  const newArt = nextSpread.querySelector('.magazine-art-page');
  const newContent = nextSpread.querySelector('.magazine-content-page');
  const stage = document.createElement('div');
  stage.className = `page-turn-stage${compact ? ' page-turn-stage--compact' : ''}`;
  stage.setAttribute('aria-hidden', 'true');
  const underlay = document.createElement('div');
  underlay.className = 'page-turn-underlay';
  if (compact) underlay.append(nextSpread);
  else underlay.append(cloneForTurn(forward ? oldArt : newArt), cloneForTurn(forward ? newContent : oldContent));
  const leaf = document.createElement('div');
  leaf.className = 'page-turn-leaf';
  leaf.style.left = compact ? '0' : rightHalf ? '50%' : '0';
  leaf.style.width = compact ? '100%' : '50%';
  leaf.style.transformOrigin = rightHalf ? 'left center' : 'right center';
  leaf.style.setProperty('--turn-angle', `${rightHalf ? '-' : ''}${compact ? 94 : 180}deg`);
  leaf.style.setProperty('--turn-duration', `${duration}ms`);
  leaf.classList.add(compact ? 'is-flipping-compact' : 'is-flipping');
  const front = document.createElement('div');
  front.className = 'page-turn-face page-turn-front';
  front.append(cloneForTurn(compact ? oldSpread : forward ? oldContent : oldArt));
  leaf.append(front);
  if (!compact) {
    const back = document.createElement('div');
    back.className = 'page-turn-face page-turn-back';
    back.append(cloneForTurn(forward ? newArt : newContent));
    leaf.append(back);
  }
  stage.append(underlay, leaf);
  const oldHeight = oldSpread.getBoundingClientRect().height;
  list.replaceChildren(stage);
  stage.style.height = `${Math.max(oldHeight, underlay.scrollHeight)}px`;
  list.setAttribute('aria-busy', 'true');
  turning = true;
  turningTo = index;
  const version = ++turnVersion;
  let finished = false;
  const finish = () => {
    if (finished || version !== turnVersion) return;
    finished = true;
    clearTimeout(turnTimer);
    turning = false;
    turningTo = null;
    activeSpread = index;
    list.removeAttribute('aria-busy');
    renderSpread();
    const queued = pendingTurn;
    pendingTurn = null;
    if (queued != null && queued !== activeSpread) turnTo(queued);
  };
  leaf.addEventListener('animationend', event => { if (event.target === leaf) finish(); }, { once: true });
  turnTimer = setTimeout(finish, duration + 120);
}

function setLanguage(next, persist = true) {
  if (!supported(next)) return;
  const currentCategory = spreads[activeSpread]?.category.id;
  language = supported(next);
  query = '';
  $('menu-search').value = '';
  if (persist) {
    try { localStorage.setItem('isabellas-menu-language', language); } catch { /* Private browsing may block storage. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', url);
  }
  renderText();
  renderMenu(currentCategory);
}

$('language-select').addEventListener('change', event => setLanguage(event.target.value));
$('menu-search').addEventListener('input', event => { query = event.target.value; activeSpread = 0; renderMenu(); });
$('category-nav').addEventListener('click', event => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  const index = spreads.findIndex(spread => spread.category.id === button.dataset.category);
  if (index < 0) return;
  turnTo(index);
});
$('reader-prev').addEventListener('click', () => turnTo((pendingTurn ?? turningTo ?? activeSpread) - 1));
$('reader-next').addEventListener('click', () => turnTo((pendingTurn ?? turningTo ?? activeSpread) + 1));
document.addEventListener('keydown', event => {
  if (!$('magazine-reader').contains(document.activeElement) || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const forward = rtlLocales.has(language) ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
  const next = (pendingTurn ?? turningTo ?? activeSpread) + (forward ? 1 : -1);
  turnTo(next);
});
let touchStart = null;
$('magazine-reader').addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
$('magazine-reader').addEventListener('touchend', event => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(deltaX) < 65 || Math.abs(deltaY) > Math.abs(deltaX) * .6) return;
  const forward = rtlLocales.has(language) ? deltaX > 0 : deltaX < 0;
  const next = (pendingTurn ?? turningTo ?? activeSpread) + (forward ? 1 : -1);
  turnTo(next);
}, { passive: true });
window.addEventListener('languagechange', () => {
  if (!fromStorage() && !new URLSearchParams(location.search).has('lang')) setLanguage(preferredLanguage(), false);
});
// GitHub Pages sirve únicamente la carta de consulta incluida en menu-data.js.
setLanguage(language, false);
