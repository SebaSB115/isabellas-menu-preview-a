const target = new URL('./design-lab/journal.html', location.href);
target.search = location.search;
target.hash = location.hash;
location.replace(target);
