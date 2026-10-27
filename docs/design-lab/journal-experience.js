import { installPageSwipe } from './journal-swipe.js?v=711235c49040';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
export function preferredLanguage(query) {
  if(['es','en'].includes(query))return query;
  try{const stored=localStorage.getItem('isabella.journal.language');if(['es','en'].includes(stored))return stored;}catch{}
  return /^es(?:-|$)/i.test(navigator.language)?'es':'en';
}
export function journalExperience({getLanguage, changeLanguage, getItems, move, priceMarkup, getSettings, getPrinted}) {
  let openedBy, scrollTop=0, active=null;
  const dialog=document.createElement('dialog');dialog.className='dish-dialog';dialog.id='dish-dialog';dialog.setAttribute('aria-labelledby','dish-detail-title');document.body.append(dialog);
  const close=()=>{
    dialog.close();document.body.classList.remove('dish-open');active=null;
    window.scrollTo({top:scrollTop,behavior:'instant'});openedBy?.focus({preventScroll:true});
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-close-dish]')||event.target===dialog)close();});
  document.addEventListener('click',event=>{
    const lang=event.target.closest('[data-language]');
    if(lang){const value=lang.dataset.language;try{localStorage.setItem('isabella.journal.language',value);}catch{}changeLanguage(value);return;}
    const trigger=event.target.closest('[data-open-dish]');if(!trigger)return;
    const item=getItems().find(i=>i.id===trigger.dataset.openDish);if(!item?.detailEnabled)return;
    active=item.id;openedBy=trigger;scrollTop=window.scrollY;
    const language=getLanguage(),en=language==='en',tx=map=>map?.[language]||map?.es||'';
    const photo=item.photo?.src?.startsWith('./assets/uploads/')?'../'+item.photo.src.slice(2):/^data:image\/(webp|png|jpeg);base64,/.test(item.photo?.src||'')?item.photo.src:null;
    dialog.innerHTML=`<header><span>Isabella’s</span><button type="button" data-close-dish>${en?'← Back to menu':'← Volver a la carta'}</button></header><div class="dish-detail-body">${photo?`<figure><img src="${escape(photo)}" alt="${escape(tx(item.name))}" style="object-position:${Number(item.photo.x)||50}% ${Number(item.photo.y)||50}%"></figure>`:''}<section><p class="small-kicker">${en?'From our kitchen':'De nuestra cocina'}</p><h1 id="dish-detail-title">${escape(tx(item.name))}</h1><p class="dish-detail-description">${escape(tx(item.description))}</p>${item.options?.length?`<dl>${item.options.map(o=>`<div><dt>${escape(tx(o.label))}</dt><dd>${priceMarkup(o.price)}</dd></div>`).join('')}</dl>`:priceMarkup(item.price)}${item.addon?`<dl><div><dt>${escape(tx(item.addon.label))}</dt><dd>${priceMarkup(item.addon.price)}</dd></div></dl>`:''}${item.available===false?`<p class="dish-unavailable">${en?'Temporarily unavailable':'No disponible hoy'}</p>`:''}</section></div>`;
    dialog.showModal();document.body.classList.add('dish-open');
  });
  installPageSwipe($('viewer'), {move, blocked:()=>Boolean(document.querySelector('dialog[open]'))});
  $('announcement-pause').addEventListener('click',()=>{
    const paused=$('menu-announcement').classList.toggle('is-paused');$('announcement-pause').setAttribute('aria-pressed',String(paused));
    $('announcement-pause').textContent=getLanguage()==='en'?(paused?'Play':'Pause'):(paused?'Reanudar':'Pausar');
  });
  return {
    isOpen:()=>dialog.open,
    render(){
      const language=getLanguage(),en=language==='en';
      document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
      const a=getSettings()?.announcement,strip=$('menu-announcement');
      strip.hidden=!a?.enabled;
      $('announcement-text').textContent=a?.[language]||a?.es||'';
      strip.classList.toggle('is-moving',Boolean(a?.moving));$('announcement-pause').hidden=!a?.moving;
      $('announcement-pause').textContent=en?(strip.classList.contains('is-paused')?'Play':'Pause'):(strip.classList.contains('is-paused')?'Reanudar':'Pausar');
      for(const download of [$('printed-menu'),$('reader-printed-menu')]){
        download.hidden=!getPrinted().includes(language);
        download.href='../api/menu.pdf?lang='+language;
        download.textContent=en?'Download the complete menu (PDF)':'Descargar la carta completa (PDF)';
      }
      if(active&&!getItems().some(i=>i.id===active&&i.detailEnabled))close();
    }
  };
}
