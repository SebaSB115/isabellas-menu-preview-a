(() => {
  const root = document.documentElement;
  root.classList.add('locale-pending');
  const supported = ['es', 'en', 'de', 'ar', 'he'];
  const read = (value) => {
    const primary = String(value || '').toLowerCase().split(/[-_]/)[0];
    const locale = primary === 'iw' ? 'he' : primary;
    return supported.includes(locale) ? locale : null;
  };
  let stored = null;
  try { stored = read(localStorage.getItem('isabellas-menu-language')); } catch { /* Storage may be unavailable. */ }
  const preferred = read(new URLSearchParams(location.search).get('lang'))
    || stored
    || (navigator.languages || [navigator.language]).map(read).find(Boolean)
    || 'es';
  root.lang = preferred;
  root.dir = preferred === 'ar' || preferred === 'he' ? 'rtl' : 'ltr';
  window.setTimeout(() => root.classList.remove('locale-pending'), 2500);
})();
