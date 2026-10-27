const target = new URL('./design-lab/journal-fluido.html', document.currentScript.src);
const query = new URLSearchParams(location.search);
const category = query.get('category');
query.delete('view');query.delete('page');query.delete('v');query.delete('category');
target.search=query.toString();
target.hash=location.hash || (category ? 'category-'+category : '');
location.replace(target);
