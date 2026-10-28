import {renderPrintBody,paginatePrint,paperArtwork} from './layout.js';
let stylesheet;
const point = px => px * 72 / 96;
const color = css => '#'+css.match(/\d+/g).slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
const paperScale = size => ({A4:1,A3:Math.SQRT2,A2:2})[size] || 1;
function scaleNode(value, factor, key = '') {
  if (Array.isArray(value)) return value.map(item => scaleNode(item, factor, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item]) => [name,scaleNode(item,factor,name)]));
  return typeof value === 'number' && ['fontSize','width','height','fit','x','y','x1','x2','y1','y2','lineWidth','characterSpacing','padding','margin'].includes(key) ? value * factor : value;
}
function loadStyles(){
  return stylesheet ||= new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./style.css',import.meta.url).href;
    link.onload=resolve;link.onerror=()=>{stylesheet=null;link.remove();reject(new Error('No se pudo cargar el diseño del menú impreso.'));};
    document.head.append(link);
  });
}
async function textureData(){
  const response=await fetch(new URL('./assets/ivory-marble.png',import.meta.url));if(!response.ok)throw new Error('No se pudo cargar el fondo del menú impreso.');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
}
// Measure the same A4 page used by Chromium, preserving selectable PDF text.
function linesOf(element,paper){
  const range=document.createRange(), walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT), lines=[];
  const style=getComputedStyle(element),bounds=element.getBoundingClientRect();let node;
  while((node=walker.nextNode())){
    for(let i=0;i<node.length;i++){
      range.setStart(node,i);range.setEnd(node,i+1);const rect=range.getBoundingClientRect();if(!rect.width)continue;
      let line=lines.at(-1);if(!line||Math.abs(line.top-rect.top)>2){line={text:'',left:rect.left,top:rect.top};lines.push(line);}line.text+=node.textContent[i];
    }
  }
  return lines.filter(l=>l.text.trim()).map(l=>({
    text:style.textTransform==='uppercase'?l.text.trimEnd().toLocaleUpperCase():l.text.trimEnd(),
    font:style.fontFamily.includes('IsabellaPrintSerif')?'IsabellaPrintSerif':'NotoSans',fontSize:point(parseFloat(style.fontSize)),color:color(style.color),
    absolutePosition:{x:point(l.left-paper.left),y:point(bounds.top-paper.top+l.top-lines[0].top)},noWrap:true,margin:0
  }));
}
export async function createPrintDefinition(snapshot,edition,logo,pdf){
  if(!snapshot.groups.length)throw new Error('No hay productos visibles para imprimir. Revisa el catálogo.');
  await loadStyles();const texture=await textureData(),font=new URL('./assets/fraunces-print.ttf',import.meta.url).href;
  pdf.addFonts({IsabellaPrintSerif:{normal:font,bold:font,italics:font,bolditalics:font}});
  const host=document.createElement('div');host.innerHTML=renderPrintBody(snapshot,{logo,texture});
  const menu=host.firstElementChild;menu.classList.add('isa-print-measure');document.body.append(menu);
  try{
    const pages=await paginatePrint(menu), content=[];
    pages.forEach((page,index)=>{
      content.push({text:' ',fontSize:1,margin:0,...(index?{pageBreak:'before'}:{})});
      const paper=page.getBoundingClientRect(),image=page.querySelector('.isa-print-masthead img').getBoundingClientRect();
      content.push({image:logo,width:point(image.width),height:point(image.height),absolutePosition:{x:point(image.left-paper.left),y:point(image.top-paper.top)}});
      for(const element of page.querySelectorAll('h2,h3,strong,.isa-dish p,.isa-variant span,.isa-chapter-head>span,.isa-print-footer p,.isa-print-footer>span,.isa-print-empty,.isa-print-digital p'))content.push(...linesOf(element,paper));
      for(const qr of page.querySelectorAll('[data-qr-url]')){const rect=qr.getBoundingClientRect();content.push({qr:qr.dataset.qrUrl,fit:point(rect.width),padding:4,eccLevel:'M',absolutePosition:{x:point(rect.left-paper.left),y:point(rect.top-paper.top)}});}
    });
    const factor=paperScale(snapshot.size),proposal=snapshot.proposal || 'actual';
    const background={stack:[...(proposal==='actual'?[{image:'ivory',width:841.89,height:595.28,absolutePosition:{x:0,y:0}}]:[]),{svg:paperArtwork(proposal),width:841.89,height:595.28,absolutePosition:{x:0,y:0}}]};
    return {
      pageSize:snapshot.size || 'A4',pageOrientation:'landscape',pageMargins:0,
      info:{title:'Isabella’s · '+(snapshot.language==='en'?'Printed menu':'Menú impreso'),author:'Isabella’s',subject:'Revision '+edition.version},
      images:{ivory:texture},
      background:()=>scaleNode(background,factor),
      defaultStyle:{font:'NotoSans',fontSize:9.2*factor,color:'#39352e'},content:scaleNode(content,factor)
    };
  }finally{menu.remove();}
}
