import {normalizePrintDesign} from '../shared-print/design.js';
export const PRINT_DESIGN_VERSION = 'isabella-ivory-2026-10-28-r2';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx = (value, language) => typeof value === 'string' ? value : value?.[language] || value?.es || '';
export const visibleCategories = catalog => catalog.categories.filter(c => c.visible !== false).map(c => ({
  id:c.id, title:c.title, items:c.items.filter(i => i.visible !== false).map(({id,name,description,price,options,addon}) => ({id,name,description,price,options,addon}))
}));
export function projectMenu(catalog, language = 'es') {
  if (!['es','en'].includes(language)) throw new Error('Idioma de impresión no válido.');
  return {language, groups:visibleCategories(catalog).filter(c => c.items.length).map(c => ({
    id:c.id,title:tx(c.title,language),items:c.items.map(i => ({
      id:i.id,name:tx(i.name,language),description:tx(i.description,language),price:i.price,
      options:(i.options || []).map(o => ({label:tx(o.label,language),price:o.price})),
      addon:i.addon ? {label:tx(i.addon.label,language),price:i.addon.price} : null
    }))
  })),publicUrl:catalog.settings?.publicUrl || ''};
}

export function paperArtwork(centerRule=true) {
  const corner = '<g fill="none" stroke="#b4a16b" stroke-width=".85" stroke-linecap="round"><path d="M2 62V2H62M7 54V7H54M2 38C12 38 23 30 23 20S12 8 12 16C12 24 30 24 37 14S53 9 49 17C46 25 35 21 41 15M7 47C17 44 22 39 26 30M30 26C39 22 44 17 47 7"/><path d="M16 33C5 31 9 22 14 25S18 30 16 33ZM33 16C31 5 22 9 25 14S30 18 33 16ZM28 25C23 18 30 14 33 20S30 24 28 25ZM25 28C18 23 14 30 20 33S24 30 25 28Z"/><circle cx="11" cy="11" r="1.7"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794" aria-hidden="true">
    <rect width="1123" height="794" fill="#faf8ef" opacity=".62"/>
    <g fill="none" stroke="#b4a16b"><rect x="23" y="23" width="1077" height="748" stroke-width=".9"/><rect x="28" y="28" width="1067" height="738" stroke-width=".4"/>
    ${centerRule?'<path d="M561.5 167V372M561.5 390V698" stroke-width=".65" opacity=".7"/><path d="M561.5 376 565 381 561.5 386 558 381Z" stroke-width=".7"/>':''}</g>
    <g transform="translate(25 25)">${corner}</g><g transform="translate(1098 25) scale(-1 1)">${corner}</g><g transform="translate(25 769) scale(1 -1)">${corner}</g><g transform="translate(1098 769) scale(-1 -1)">${corner}</g>
  </svg>`;
}

export function renderPrintBody(snapshot, assets = {}) {
  const en = snapshot.language === 'en';
  const design=snapshot.design?normalizePrintDesign(snapshot.design,'isabella'):null;
  const style=design?` style="--print-columns:${design.columns};--print-margin:${design.margin}mm;--print-gap:${design.gutter}mm;--print-logo:${design.logoWidth}mm;--print-title:${design.titleSize}pt;--print-body:${design.bodySize}pt;--print-item-gap:${design.itemSpacing}mm;--print-logo-align:${design.logoAlign==='left'?'flex-start':'center'}"`:'';
  const logo = assets.logo || new URL('../central/assets/isabella-logo-transparent.png', import.meta.url).href;
  const texture = assets.texture || new URL('./assets/ivory-marble.png', import.meta.url).href;
  const price = p => p == null ? (en ? 'Ask for price' : 'Consultar precio') : '₡'+new Intl.NumberFormat('en-US').format(p);
  const variant = v => `<div class="isa-variant"><span>${escape(v.label)}</span><strong>${escape(price(v.price))}</strong></div>`;
  return `<main class="isabella-print" data-language="${snapshot.language}" data-ornament="${design?.ornament===false?'false':'true'}"${style} aria-label="${en?'Printed menu':'Menú impreso'}">
    <template data-print-source>${snapshot.groups.map(g=>`<section data-group="${escape(g.id)}"><h2>${escape(g.title)}</h2>${g.items.map(i=>`<article class="isa-dish" data-product-id="${escape(i.id)}"><div class="isa-dish-title"><h3>${escape(i.name)}</h3>${i.options.length?'':`<strong>${escape(price(i.price))}</strong>`}</div>${i.description?`<p>${escape(i.description)}</p>`:''}${i.options.map(variant).join('')}${i.addon?variant(i.addon):''}</article>`).join('')}</section>`).join('')}</template>
    <template data-print-paper><div class="isa-print-page"><section class="isa-print-sheet">
      <div class="isa-paper-art"><img class="isa-paper-texture" src="${escape(texture)}" alt="">${paperArtwork(design?.columns!==1)}</div>
      <header class="isa-print-masthead"><img src="${escape(logo)}" alt="Isabella’s · Pizzería & Wine Bar"></header>
      <div class="isa-print-columns"><div class="isa-print-column"></div><div class="isa-print-column"></div></div>
      <footer class="isa-print-footer"><p>${en?'Prices in Costa Rican colones. Taxes included; 10% service not included.':'Precios en colones costarricenses. Incluyen impuestos; no incluyen 10 % de servicio.'}</p><span data-page-number></span></footer>
    </section></div></template>
    ${snapshot.publicUrl?`<template data-print-qr><aside class="isa-print-digital"><div data-qr-url="${escape(snapshot.publicUrl)}">${assets.qrImage?`<img src="${escape(assets.qrImage)}" alt="QR">`:''}</div><p>${en?'Explore our digital menu':'Consulta la carta digital'}</p></aside></template>`:''}
  </main>`;
}

export async function paginatePrint(menu) {
  await Promise.all([document.fonts.load('16px IsabellaPrintSerif'),document.fonts.load('16px IsabellaPrintSans')]);
  menu.querySelectorAll('.isa-print-page').forEach(p=>p.remove());
  const groups=[...menu.querySelector('[data-print-source]').content.children], paper=menu.querySelector('[data-print-paper]'), en=menu.dataset.language==='en';
  let column, columns, index=1;
  function nextColumn() {
    if(!columns||index===columns.length-1){const page=paper.content.firstElementChild.cloneNode(true);menu.append(page);columns=[...page.querySelectorAll('.isa-print-column')].filter(c=>getComputedStyle(c).display!=='none');index=0;}else index++;
    column=columns[index];
  }
  const fits=()=>column.scrollHeight<=column.clientHeight+1;
  function heading(group,continued=false){
    const head=document.createElement('header');head.className='isa-chapter-head';head.append(group.querySelector('h2').cloneNode(true));
    if(continued){const note=document.createElement('span');note.textContent=en?'continued':'continuación';head.append(note);}
    column.append(head);return head;
  }
  function continuation(original,group) {
    nextColumn();heading(group,true);
    const item=original.cloneNode(true);item.querySelectorAll('p,.isa-variant,strong').forEach(n=>n.remove());
    item.querySelector('h3').textContent+=en?' · continued':' · continuación';
    column.append(item);return item;
  }
  nextColumn();
  for(const group of groups){
    let head=heading(group),first=true;
    for(const original of group.querySelectorAll('.isa-dish')){
      let item=original.cloneNode(true);column.append(item);
      if(!fits()&&(head.previousElementSibling||!first)){
        item.remove();if(first)head.remove();
        nextColumn();head=heading(group,!first);column.append(item);
      }
      if(!fits()){
        const variants=[...item.querySelectorAll('.isa-variant')];variants.forEach(v=>v.remove());
        while(!fits()){
          const paragraph=item.querySelector('p');
          if(!paragraph)throw new Error('El nombre del plato no cabe en la página impresa.');
          const words=paragraph.textContent.match(/\S+\s*/g)||[];let low=0,high=words.length;
          while(low<high){const middle=Math.ceil((low+high)/2);paragraph.textContent=words.slice(0,middle).join('');if(fits())low=middle;else high=middle-1;}
          if(!low)throw new Error('El plato no cabe en la página impresa.');
          paragraph.textContent=words.slice(0,low).join('');
          item=continuation(original,group);
          const remainder=document.createElement('p');remainder.textContent=words.slice(low).join('');item.append(remainder);
        }
        for(const variant of variants){
          item.append(variant);
          if(!fits()){variant.remove();item=continuation(original,group);item.append(variant);if(!fits())throw new Error('La variante no cabe en la página impresa.');}
        }
      }
      first=false;
    }
  }
  const qr=menu.querySelector('[data-print-qr]');
  if(qr){const block=qr.content.firstElementChild.cloneNode(true);column.append(block);if(!fits()){block.remove();nextColumn();column.append(block);}}
  if(!groups.length){const empty=document.createElement('p');empty.className='isa-print-empty';empty.textContent=en?'There are no visible dishes.':'No hay platos visibles.';column.append(empty);}
  const pages=[...menu.querySelectorAll('.isa-print-sheet')], [left,right]=pages.at(-1).querySelectorAll('.isa-print-column');
  const used=c=>c.lastElementChild?c.lastElementChild.getBoundingClientRect().bottom-c.getBoundingClientRect().top:0;
  for(let i=0;right&&i<groups.length;i++){
    const head=[...left.querySelectorAll('.isa-chapter-head')].at(-1);
    if(!head?.previousElementSibling||used(left)<=used(right))break;
    const difference=Math.abs(used(left)-used(right)),moving=[];let n=head;
    while(n){moving.push(n);n=n.nextElementSibling;}
    const fragment=document.createDocumentFragment();fragment.append(...moving);right.prepend(fragment);
    if(right.scrollHeight>right.clientHeight+1||Math.abs(used(left)-used(right))>=difference){left.append(...moving);break;}
  }
  // A final category also uses both columns when it has several complete dishes.
  if(right&&!right.children.length&&left.querySelectorAll('.isa-chapter-head').length===1){
    const original=[...left.children],head=original[0],dishes=original.filter(n=>n.matches('.isa-dish'));
    if(head.matches('.isa-chapter-head')&&dishes.length>1){
      const trailing=original.filter(n=>n!==head&&!n.matches('.isa-dish'));
      const continued=head.cloneNode(true);
      if(!continued.querySelector('span')){const note=document.createElement('span');note.textContent=en?'continued':'continuación';continued.append(note);}
      let best=0,difference=used(left);
      for(let split=1;split<dishes.length;split++){
        left.replaceChildren(head,...dishes.slice(0,split));
        right.replaceChildren(continued,...dishes.slice(split),...trailing);
        const candidate=Math.abs(used(left)-used(right));
        if(left.scrollHeight<=left.clientHeight+1&&right.scrollHeight<=right.clientHeight+1&&candidate<difference){best=split;difference=candidate;}
      }
      if(best){left.replaceChildren(head,...dishes.slice(0,best));right.replaceChildren(continued,...dishes.slice(best),...trailing);}
      else{left.replaceChildren(...original);right.replaceChildren();}
    }
  }
  pages.forEach((page,i)=>page.querySelector('[data-page-number]').textContent=`${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`);
  await Promise.all([...menu.querySelectorAll('img')].map(i=>i.decode()));
  return pages;
}

export function fitPrintPreview(menu){
  const update=()=>{const paper=menu.querySelector('.isa-print-sheet');if(paper)menu.style.setProperty('--isa-paper-scale',Math.min(1,menu.clientWidth/paper.offsetWidth));};
  const observer=new ResizeObserver(update);observer.observe(menu);update();return()=>observer.disconnect();
}
