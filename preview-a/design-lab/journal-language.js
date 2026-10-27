export function preferredLanguage(query) {
  if(['es','en'].includes(query))return query;
  try{const stored=localStorage.getItem('isabella.journal.language');if(['es','en'].includes(stored))return stored;}catch{}
  return /^es(?:-|$)/i.test(navigator.language)?'es':'en';
}
