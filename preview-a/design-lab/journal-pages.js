// The Journal measures rendered dish rows so edited descriptions, options and
// translations determine page breaks. Pages never have a fixed clipping height.
export function createJournalPaginator({ viewer, dishMarkup, getLanguage }) {
  const cache = new Map();

  function contentWidth() {
    const style = getComputedStyle(viewer);
    return Math.max(240, viewer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
  }

  function measure(items, width) {
    const ruler = document.createElement('div');
    ruler.className = 'journal-flow-measure journal-page__dishes';
    ruler.style.width = `${Math.max(220, width)}px`;
    ruler.innerHTML = items.map(dishMarkup).join('');
    document.body.append(ruler);
    const heights = [...ruler.children].map(node => Math.ceil(node.getBoundingClientRect().height));
    ruler.remove();
    return heights;
  }

  function take(items, heights, start, budget) {
    let end = start;
    let used = 0;
    while (end < items.length && (end === start || used + heights[end] <= budget)) {
      used += heights[end];
      end += 1;
    }
    return end;
  }

  function splitBalanced(items, heights) {
    if (items.length < 2) return [items, []];
    const total = heights.reduce((sum, height) => sum + height, 0);
    let leftHeight = 0;
    let bestIndex = 1;
    let bestDifference = Infinity;
    for (let index = 1; index < items.length; index += 1) {
      leftHeight += heights[index - 1];
      const difference = Math.abs(total - 2 * leftHeight);
      if (difference < bestDifference) { bestDifference = difference; bestIndex = index; }
    }
    return [items.slice(0, bestIndex), items.slice(bestIndex)];
  }

  function partitionBalanced(items, heights, budget) {
    const total = heights.reduce((sum, height) => sum + height, 0);
    const pageCount = Math.min(items.length, Math.max(1, Math.ceil(total / budget)));
    const partitions = [];
    let start = 0;
    let remainingHeight = total;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pagesLeft = pageCount - pageIndex;
      if (pagesLeft === 1) {
        partitions.push({ items:items.slice(start), heights:heights.slice(start) });
        break;
      }
      const target = remainingHeight / pagesLeft;
      const lastAvailable = items.length - (pagesLeft - 1);
      let end = start + 1;
      let used = heights[start];
      while (end < lastAvailable && Math.abs(used + heights[end] - target) <= Math.abs(used - target)) {
        used += heights[end];
        end += 1;
      }
      partitions.push({ items:items.slice(start,end), heights:heights.slice(start,end) });
      start = end;
      remainingHeight -= used;
    }
    return partitions;
  }

  function paginate(category) {
    const width = contentWidth();
    const language = getLanguage();
    const mobileReader = innerWidth <= 760;
    const readerHeight = mobileReader ? viewer.clientHeight : 0;
    const key = `${category.id}:${language}:${Math.round(width)}:${innerHeight}:${readerHeight}`;
    if (cache.has(key)) return cache.get(key);

    const items = category.items;
    if (!items.length) {
      const empty = [{ kind:'photo', columns:[[]] }];
      cache.set(key, empty);
      return empty;
    }

    const desktop = innerWidth >= 1060;
    const firstWidth = desktop ? width * .54 - 34 : width;
    const firstHeights = measure(items, firstWidth);
    const toolbarBottom = (document.querySelector('.chapter-toolbar')?.getBoundingClientRect().bottom ?? 200) + scrollY;
    const firstBudget = mobileReader
      ? Math.max(80, readerHeight - Math.min(180, Math.max(90, innerHeight * .22)) - (innerWidth < 370 ? 171 : 155))
      : desktop
      ? Math.max(350, Math.min(530, innerHeight - toolbarBottom - 145))
      : Math.max(290, Math.min(480, innerHeight - toolbarBottom - 370));
    const firstEnd = mobileReader && firstHeights[0] > firstBudget ? 0 : take(items, firstHeights, 0, firstBudget);
    const pages = [{ kind:'photo', columns:[items.slice(0, firstEnd)] }];

    if (firstEnd < items.length) {
      const columnWidth = desktop ? (width - 68) / 2 : width;
      const heights = measure(items, columnWidth);
      const columnBudget = mobileReader ? Math.max(180, readerHeight - 145) : Math.max(460, Math.min(710, innerHeight - toolbarBottom - 125));
      const portions = mobileReader ? [] : partitionBalanced(items.slice(firstEnd), heights.slice(firstEnd), columnBudget * (desktop ? 2 : 1));
      if (mobileReader) {
        for (let start = firstEnd; start < items.length;) {
          const end = take(items, heights, start, columnBudget);
          portions.push({ items:items.slice(start,end), heights:heights.slice(start,end) });
          start = end;
        }
      }
      for (const portion of portions) {
        pages.push({ kind:'type', columns:desktop ? splitBalanced(portion.items, portion.heights) : [portion.items] });
      }
    }

    cache.set(key, pages);
    return pages;
  }

  return { paginate, clear:() => cache.clear() };
}
