// Compare normalized form values, not keystrokes. Reverting a value clears dirty state.
export function formSnapshot(form, images = {}) {
  if (!form) return '';
  const controls = [...form.querySelectorAll('input,textarea,select')].filter(el => el.type !== 'file' && !el.hasAttribute('data-preview-only'));
  return JSON.stringify({ fields:controls.map(el => [
    el.name || el.id,
    el.type === 'checkbox' ? el.checked : el.type === 'number' && el.value !== '' ? Number(el.value) : el.value.trim()
  ]), images });
}
export function tablerComponents(root = document) {
  root.querySelectorAll('input:not([type=checkbox]):not([type=range]),textarea').forEach(el=>el.classList.add('form-control'));
  root.querySelectorAll('select').forEach(el=>el.classList.add('form-select'));
  root.querySelectorAll('input[type=checkbox]').forEach(el=>el.classList.add('form-check-input'));
  root.querySelectorAll('.primary-button,.text-button,.danger-button,.secondary-button,.sidebar-toggle,.top-actions button,#unpriced-filter').forEach(el=>{
    el.classList.add('btn');
    if(el.classList.contains('primary-button')) el.classList.add('btn-primary');
    if(el.classList.contains('danger-button')) el.classList.add('btn-outline-danger');
  });
}
