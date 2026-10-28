import {paginatePrint,fitPrintPreview} from './layout.js';
try{
  await paginatePrint(document.querySelector('.isabella-print'));
  fitPrintPreview(document.querySelector('.isabella-print'));
  document.documentElement.dataset.ready='true';
  const button=document.querySelector('#isa-print-button');button.disabled=false;button.addEventListener('click',()=>window.print());
}catch(error){document.documentElement.dataset.ready='error';const message=document.querySelector('#isa-print-message');message.textContent=error.message;message.setAttribute('role','alert');}
