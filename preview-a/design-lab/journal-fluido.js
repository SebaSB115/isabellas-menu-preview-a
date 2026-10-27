import { categories as seed } from '../menu-data.js';
import { preferredLanguage } from './journal-experience.js';

const $ = id => document.getElementById(id);
const chromeWords={
  es:{preview:'Propuesta local · La carta actual sigue disponible',unavailable:'Catálogo actualizado no disponible; se muestra la referencia guardada',home:'Isabella’s · Ir al inicio',notice:'Aviso del restaurante',allCategories:'Todas las categorías',index:'Índice de la carta',footer:'Isabella’s · Menú 2026'},
  en:{preview:'Local proposal · The current menu remains available',unavailable:'Updated menu unavailable; showing the saved reference',home:'Isabella’s · Back to start',notice:'Restaurant announcement',allCategories:'All categories',index:'Menu index',footer:'Isabella’s · Menu 2026'},
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const words = {
  es:{categories:'Categorías',close:'Cerrar categorías',menu:'La carta',intro:'Cocina italiana para disfrutar a tu ritmo.',price:'Consultar precio',unavailable:'No disponible hoy',details:'Ver detalles',back:'Volver a la carta',reference:'Fotografía editorial de referencia',categoryImage:'Imagen de la categoría',service:'Precios en colones. Incluyen impuestos; no incluyen 10 % de servicio.',fallback:'Algunos textos aún se muestran en español.',download:'Descargar carta completa (PDF)',current:'Ver diseño actual',credits:'Fotografías y créditos',pause:'Pausar',play:'Reanudar',empty:'No hay platos visibles en esta categoría.',skip:'Saltar a los platos'},
  en:{categories:'Categories',close:'Close categories',menu:'The menu',intro:'Italian cooking to enjoy at your own pace.',price:'Ask for price',unavailable:'Temporarily unavailable',details:'View details',back:'Back to menu',reference:'Editorial reference photograph',categoryImage:'Category image',service:'Prices in colones include tax; 10% service is not included.',fallback:'Some text is still shown in Spanish.',download:'Download complete menu (PDF)',current:'View current design',credits:'Photographs and credits',pause:'Pause',play:'Resume',empty:'No visible dishes in this category.',skip:'Skip to dishes'},
  de:{categories:'Kategorien',close:'Kategorien schließen',menu:'Die Speisekarte',intro:'Italienische Küche in Ihrem eigenen Tempo genießen.',price:'Preis erfragen',unavailable:'Zurzeit nicht verfügbar',details:'Details ansehen',back:'Zurück zur Speisekarte',reference:'Redaktionelles Referenzfoto',categoryImage:'Kategoriebild',service:'Preise in Colón inkl. Steuern; 10 % Service nicht enthalten.',fallback:'Einige Texte werden noch auf Spanisch angezeigt.',download:'Gesamte Speisekarte herunterladen (PDF)',current:'Aktuelles Design ansehen',credits:'Fotos und Bildnachweise',pause:'Pausieren',play:'Fortsetzen',empty:'In dieser Kategorie sind keine Gerichte sichtbar.',skip:'Zu den Gerichten springen'},
  ar:{categories:'الأقسام',close:'إغلاق الأقسام',menu:'قائمة الطعام',intro:'المطبخ الإيطالي لتستمتع به على مهل.',price:'اسأل عن السعر',unavailable:'غير متوفر اليوم',details:'عرض التفاصيل',back:'العودة إلى القائمة',reference:'صورة تحريرية مرجعية',categoryImage:'صورة القسم',service:'الأسعار بالكولون وتشمل الضرائب؛ لا تشمل 10٪ خدمة.',fallback:'تظهر بعض النصوص بالإسبانية حاليًا.',download:'تنزيل القائمة الكاملة (PDF)',current:'عرض التصميم الحالي',credits:'الصور والمصادر',pause:'إيقاف مؤقت',play:'متابعة',empty:'لا توجد أطباق ظاهرة في هذا القسم.',skip:'الانتقال إلى الأطباق'},
  he:{categories:'קטגוריות',close:'סגירת קטגוריות',menu:'התפריט',intro:'מטבח איטלקי שאפשר ליהנות ממנו בקצב שלכם.',price:'יש לברר מחיר',unavailable:'לא זמין היום',details:'הצגת פרטים',back:'חזרה לתפריט',reference:'צילום עריכתי להמחשה',categoryImage:'תמונת הקטגוריה',service:'המחירים בקולון כוללים מסים; אינם כוללים 10% שירות.',fallback:'חלק מהטקסט עדיין מוצג בספרדית.',download:'הורדת התפריט המלא (PDF)',current:'הצגת העיצוב הנוכחי',credits:'תצלומים וקרדיטים',pause:'השהיה',play:'המשך',empty:'אין מנות מוצגות בקטגוריה זו.',skip:'מעבר למנות'},
};
const detailWords={
  es:{open:'Ver ficha de',close:'Cerrar ficha',variants:'Variantes',addon:'Adicional'},
  en:{open:'View page for',close:'Close page',variants:'Variations',addon:'Addition'},
  de:{open:'Gericht ansehen:',close:'Seite schließen',variants:'Varianten',addon:'Zusatz'},
  ar:{open:'عرض طبق',close:'إغلاق الصفحة',variants:'الخيارات',addon:'إضافة'},
  he:{open:'הצגת מנה',close:'סגירת העמוד',variants:'אפשרויות',addon:'תוספת'},
};
// Temporary category illustrations. Editorial uploads always take precedence.
const referenceImages = Object.fromEntries(
  ['salads','starters','focaccia','stromboli','pasta','meats','cocktails','coffee'].map(id => [
    id,
    { src:`./assets/reference-v2/${id}-1086.webp`,
      srcSmall:`./assets/reference-v2/${id}-720.webp`,
      srcWidth:1086, srcHeight:1448, srcSmallWidth:720, srcSmallHeight:960,
      x:50, y:50 }
  ])
);
referenceImages.stromboli.src = './assets/reference-v2/stromboli-1087.webp';
referenceImages.stromboli.srcWidth = 1087;
referenceImages.stromboli.srcHeight = 1447;
const storageKey = 'isabella.journal.language';
const query = new URLSearchParams(location.search);
function initialLanguage() {
  return preferredLanguage(query.get('lang'));
}
let language=initialLanguage();
let catalog={version:0,categories:seed,settings:{},printed:[]};
let catalogUnavailable=false;
let activeId='';
let scrollScheduled=false;
let openedBy=null;

const text = value => value?.[language]?.trim() || value?.es?.trim() || '';
const localized = value => `<span${value?.[language]?.trim() ? '' : ' lang="es"'}>${escapeHtml(text(value))}</span>`;
const money = price => price == null ? `<span class="price price--missing">${words[language].price}</span>` : `<span class="price"><bdi dir="ltr">₡${new Intl.NumberFormat('en-US').format(price)}</bdi></span>`;
const asset = source => source?.startsWith('./assets/uploads/') ? `../${source.slice(2)}` : source || '';
const visibleCategories = () => catalog.categories.filter(category=>category.visible!==false).map(category=>({...category,items:(category.items||[]).filter(item=>item.visible!==false)}));
const productPhoto = item => item.photo?.src ? item.photo : null;
function originalPhoto(category){
  const sample=referenceImages[category.id];
  const image=category.editorialPhoto?.src ? {...category.editorialPhoto,small:category.editorialPhoto.srcSmall,label:words[language].categoryImage} : sample ? {...sample,label:language==='en'?'Sample image · not an official photograph':'Imagen de muestra · no es fotografía oficial'} : null;
  return image&&category.items.some(item=>productPhoto(item)?.src===image.src)?null:image;
}
const position = image => `${Math.min(100,Math.max(0,Number(image?.x ?? 50)))}% ${Math.min(100,Math.max(0,Number(image?.y ?? 50)))}%`;
function picture(image,caption,kind,index=0) {
  const src=escapeHtml(asset(image.src));
  const largeWidth=Number(image.srcWidth),smallWidth=Number(image.srcSmallWidth);
  const small=image.small||image.srcSmall;
  const srcset=small&&small!==image.src&&Number.isFinite(largeWidth)&&largeWidth>0&&Number.isFinite(smallWidth)&&smallWidth>0&&smallWidth<largeWidth&&!/^data:/.test(small) ? ` srcset="${escapeHtml(asset(small))} ${smallWidth}w, ${src} ${largeWidth}w" sizes="${kind==='detail'?'(max-width: 759px) 100vw, 42vw':'(max-width: 759px) 100vw, (max-width: 1023px) 55vw, 40vw'}"` : '';
  const width=largeWidth>0?largeWidth:800,height=Number(image.srcHeight)>0?Number(image.srcHeight):600;
  return `<figure class="${kind}-figure"><img src="${src}"${srcset} alt="" width="${width}" height="${height}" loading="${kind==='detail'||index===0?'eager':'lazy'}" decoding="async" style="object-position:${position(image)}"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}
function variants(item) {
  const options=(item.options||[]).map(option=>`<div><span>${localized(option.label)}</span>${money(option.price)}</div>`).join('');
  const addon=item.addon ? `<div><span>${localized(item.addon.label)}</span>${money(item.addon.price)}</div>` : '';
  return options||addon ? `<div class="dish-options">${options}${addon}</div>` : '';
}
function dish(item) {
  const title=item.detailEnabled===false?localized(item.name):`<button type="button" class="dish__title-button" data-detail="${escapeHtml(item.id)}" aria-haspopup="dialog" aria-controls="dish-dialog" aria-label="${escapeHtml(detailWords[language].open+' '+text(item.name))}">${localized(item.name)}<span aria-hidden="true" class="dish__title-arrow">↗</span></button>`;
  return `<article class="dish" id="dish-${escapeHtml(item.id)}" data-dish="${escapeHtml(item.id)}"><div class="dish__copy"><div class="dish__heading"><h3>${title}</h3>${item.options?.length?'':money(item.price)}</div><p class="dish__description">${localized(item.description)}</p>${variants(item)}${item.available===false?`<p class="dish__unavailable">${words[language].unavailable}</p>`:''}</div></article>`;
}
function chapter(category,index) {
  const image=originalPhoto(category);
  const heading=`<header class="chapter__heading"><span class="chapter__number"><bdi dir="ltr">${String(index+1).padStart(2,'0')}</bdi></span><h2 id="heading-${escapeHtml(category.id)}" tabindex="-1">${localized(category.title)}</h2></header>`;
  const long=category.items.length>=8;
  const dishes=category.items.length ? category.items.map(dish).join('') : `<p class="empty-category">${words[language].empty}</p>`;
  return `<section class="chapter${image?' chapter--with-image':''}${long?' chapter--long':''}" id="category-${escapeHtml(category.id)}" aria-labelledby="heading-${escapeHtml(category.id)}">${heading}<div class="chapter__body">${image?picture(image,image.label,'category',index):''}<div class="chapter__dishes">${dishes}</div></div></section>`;
}
function navMarkup(categories,kind) {
  return categories.map((category,index)=>`<a href="#category-${escapeHtml(category.id)}" data-category-link="${escapeHtml(category.id)}"${kind==='sidebar'?' class="sidebar-link"':''}><span class="nav-number"><bdi dir="ltr">${String(index+1).padStart(2,'0')}</bdi></span><span>${localized(category.title)}</span></a>`).join('');
}
function hasFallback(categories) {
  if(language==='es')return false;
  return categories.some(category=>![category.title,...category.items.flatMap(item=>[item.name,item.description,...(item.options||[]).map(option=>option.label),...(item.addon?[item.addon.label]:[])])].every(value=>value?.[language]?.trim()));
}
function render() {
  const t=words[language],categories=visibleCategories();
  document.documentElement.lang=language;
  document.documentElement.dir='ltr';
  document.title=`Isabella’s Journal · ${t.menu}`;
  updatePreviewLabel();
  $('language-switch').setAttribute('aria-label',language==='es'?'Idioma de la carta':'Menu language');
  document.querySelector('.brand').setAttribute('aria-label',chromeWords[language].home);
  $('announcement').setAttribute('aria-label',chromeWords[language].notice);
  $('category-rail').setAttribute('aria-label',t.categories);
  document.querySelector('.menu-sidebar').setAttribute('aria-label',chromeWords[language].index);
  $('index-links').setAttribute('aria-label',chromeWords[language].allCategories);
  $('footer-menu-label').textContent=chromeWords[language].footer;
  document.querySelectorAll('#language-switch [data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  $('skip-link').textContent=t.skip;
  $('index-trigger-label').textContent=t.categories;
  $('index-title').textContent=t.categories;
  $('index-close').setAttribute('aria-label',t.close);
  $('category-rail').setAttribute('aria-label',t.categories);
  $('intro-title').textContent=t.menu;
  $('service-note').textContent=t.service;
  $('fallback-note').textContent=t.fallback;
  $('fallback-note').hidden=!hasFallback(categories);
  $('current-menu').textContent=t.current;
  $('index-current-menu').textContent=t.current;
  $('photo-credits').textContent=t.credits;
  $('sidebar-links').innerHTML=navMarkup(categories,'sidebar');
  $('index-links').innerHTML=navMarkup(categories,'index');
  $('chapters').innerHTML=categories.map(chapter).join('');
  activeId='';
  const current=new URL('./journal.html',location.href);current.searchParams.set('lang',language);
  $('current-menu').href=current;
  $('index-current-menu').href=current;
  const printed=Array.isArray(catalog.printed)&&catalog.printed.includes(language);
  $('printed-menu').hidden=!printed;
  $('printed-menu').href=`../api/menu.pdf?lang=${language}`;
  $('printed-menu').textContent=t.download;
  const notice=catalog.settings?.announcement;
  const promotionText=(notice?.[language]||notice?.es||'').trim();
  $('announcement').hidden=!notice?.enabled||!promotionText;
  $('announcement-text').textContent=promotionText;
  $('announcement-label').textContent=language==='en'?'Special offers':'Promociones';
  $('announcement').setAttribute('aria-label',$('announcement-label').textContent);
  $('announcement-pause').hidden=!notice?.moving;
  $('announcement-pause').textContent=$('announcement-pause').getAttribute('aria-pressed')==='true'?t.play:t.pause;
  $('announcement').classList.toggle('announcement--moving',Boolean(notice?.moving));
  syncStickyMeasurements();
  updateActive();
}
function updatePreviewLabel(){
  const copy=chromeWords[language];
  $('preview-note').textContent=copy.preview+(catalogUnavailable?' · '+copy.unavailable:'');
}
function syncStickyMeasurements(){
  document.documentElement.style.setProperty('--header-height',`${Math.ceil($('site-header').getBoundingClientRect().height)}px`);
  document.documentElement.style.setProperty('--rail-height',`${Math.ceil($('category-rail').getBoundingClientRect().height)}px`);
}
function updateActive() {
  const top=$('site-header').getBoundingClientRect().height+$('category-rail').getBoundingClientRect().height+28;
  const sections=[...document.querySelectorAll('.chapter')];
  const current=sections.filter(section=>section.getBoundingClientRect().top<=top).at(-1)||sections[0];
  const id=current?.id.slice('category-'.length)||'';
  if(id===activeId)return;
  activeId=id;
  const category=visibleCategories().find(entry=>entry.id===id);
  $('active-category-name').textContent=category?text(category.title):words[language].menu;
  document.querySelectorAll('[data-category-link]').forEach(link=>{
    if(link.dataset.categoryLink===id)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}
async function readCatalog() {
  const response=await fetch('../api/menu',{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo leer la carta.');
  return response.json();
}
async function refreshCatalog(initial=false) {
  try {
    const next=await readCatalog();
    catalogUnavailable=false;
    updatePreviewLabel();
    if(!Array.isArray(next.categories)||next.version===catalog.version)return;
    const current=document.querySelector('.chapter[id="category-'+activeId+'"]');
    const previousTop=current?.getBoundingClientRect().top;
    catalog=next;
    if(initial)return;
    render();
    if(previousTop!=null&&activeId){
      const replacement=document.getElementById('category-'+activeId);
      if(replacement)window.scrollBy(0,replacement.getBoundingClientRect().top-previousTop);
    }
  } catch {
    catalogUnavailable=true;
    updatePreviewLabel();
  }
}

$('language-switch').addEventListener('click',event=>{
  const button=event.target.closest('[data-language]');
  if(!button||button.dataset.language===language)return;
  const previousId=activeId;
  const previousTop=document.getElementById('category-'+previousId)?.getBoundingClientRect().top;
  language=button.dataset.language;
  try{localStorage.setItem(storageKey,language);}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState({},'',url);
  render();
  if(previousTop!=null){
    const current=document.getElementById('category-'+previousId);
    if(current)window.scrollBy(0,current.getBoundingClientRect().top-previousTop);
  }
});
const index=$('index-dialog');
let indexNavigating=false;
$('index-trigger').addEventListener('click',()=>index.showModal());
$('index-close').addEventListener('click',()=>index.close());
index.addEventListener('close',()=>{
  if(indexNavigating){
    const destination=location.hash.slice(1);
    requestAnimationFrame(()=>document.getElementById(destination)?.querySelector('h2')?.focus({preventScroll:true}));
    indexNavigating=false;
  } else $('index-trigger').focus({preventScroll:true});
});
index.addEventListener('click',event=>{
  if(event.target.closest('[data-category-link]')){indexNavigating=true;index.close();}
  else if(event.target===index)index.close();
});
const detail=$('dish-dialog');
document.addEventListener('error',event=>{
  const figure=event.target instanceof HTMLImageElement ? event.target.closest('.category-figure,.detail-figure') : null;
  if(!figure)return;
  if(figure.classList.contains('detail-figure'))detail.classList.add('dish-dialog--no-photo');
  else figure.closest('.chapter')?.classList.remove('chapter--with-image');
  figure.remove();
},true);
let openedId='';
let lockedScroll=null;
function detailOptions(item){
  const options=(item.options||[]).map(option=>`<div class="dish-dialog__option"><span>${localized(option.label)}</span>${money(option.price)}</div>`).join('');
  const addon=item.addon?`<section class="dish-dialog__variants"><h3>${detailWords[language].addon}</h3><div class="dish-dialog__option"><span>${localized(item.addon.label)}</span>${money(item.addon.price)}</div></section>`:'';
  return `${options?`<section class="dish-dialog__variants"><h3>${detailWords[language].variants}</h3>${options}</section>`:''}${addon}`;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-detail]');
  if(!button)return;
  const category=visibleCategories().find(entry=>entry.items.some(product=>product.id===button.dataset.detail));
  const item=category?.items.find(product=>product.id===button.dataset.detail);
  if(!item||item.detailEnabled===false||detail.open)return;
  openedBy=button;
  openedId=item.id;
  const photo=productPhoto(item);
  detail.classList.toggle('dish-dialog--no-photo',!photo);
  detail.innerHTML=`<div class="dish-dialog__header"><span>Isabella’s Journal</span><button type="button" data-close-detail aria-label="${escapeHtml(detailWords[language].close)}">${escapeHtml(detailWords[language].close)} <span aria-hidden="true">×</span></button></div><article class="dish-dialog__page">${photo?picture(photo,text(item.name),'detail'):''}<div class="dish-dialog__copy"><p class="dish-dialog__kicker">${localized(category.title)}</p><h2 id="dish-title" tabindex="-1">${localized(item.name)}</h2>${item.options?.length?'':`<div class="dish-dialog__price">${money(item.price)}</div>`}${item.description?.[language]?.trim()||item.description?.es?.trim()?`<p class="dish-dialog__description">${localized(item.description)}</p>`:''}${detailOptions(item)}${item.available===false?`<p class="dish__unavailable">${words[language].unavailable}</p>`:''}</div></article>`;
  lockedScroll={x:window.scrollX,y:window.scrollY,bodyStyle:document.body.style.cssText};
  document.body.style.position='fixed';
  document.body.style.top=`-${lockedScroll.y}px`;
  document.body.style.left=`-${lockedScroll.x}px`;
  document.body.style.width='100%';
  detail.showModal();
});
detail.addEventListener('click',event=>{if(event.target.closest('[data-close-detail]'))detail.close();});
document.addEventListener('keydown',event=>{
  if(detail.open&&event.key==='Tab'){
    event.preventDefault();
    detail.querySelector('[data-close-detail]')?.focus();
  }
});
detail.addEventListener('close',()=>{
  if(lockedScroll){
    const {x,y,bodyStyle}=lockedScroll;
    document.body.style.cssText=bodyStyle;
    window.scrollTo(x,y);
    lockedScroll=null;
  }
  const target=openedBy?.isConnected?openedBy:document.querySelector(`[data-detail="${CSS.escape(openedId)}"]`);
  target?.focus({preventScroll:true});
  openedBy=null;
  openedId='';
});
$('announcement-pause').addEventListener('click',()=>{
  const button=$('announcement-pause');const paused=button.getAttribute('aria-pressed')!=='true';
  button.setAttribute('aria-pressed',String(paused));button.textContent=paused?words[language].play:words[language].pause;
  $('announcement').classList.toggle('announcement--paused',paused);
});
addEventListener('scroll',()=>{if(scrollScheduled)return;scrollScheduled=true;requestAnimationFrame(()=>{scrollScheduled=false;updateActive();});},{passive:true});
addEventListener('hashchange',()=>requestAnimationFrame(updateActive));
addEventListener('resize',()=>{syncStickyMeasurements();updateActive();});
new ResizeObserver(()=>{syncStickyMeasurements();updateActive();}).observe($('site-header'));
new ResizeObserver(()=>{syncStickyMeasurements();updateActive();}).observe($('category-rail'));
addEventListener('focus',()=>refreshCatalog());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCatalog();});

await refreshCatalog(true);
render();
if(location.hash.startsWith('#category-')){
  const alignFragment=()=>{
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:'start',behavior:'instant'});
    requestAnimationFrame(updateActive);
  };
  requestAnimationFrame(alignFragment);
  addEventListener('load',alignFragment,{once:true});
  setTimeout(updateActive,120);
}
