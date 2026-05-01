const STORAGE_KEY = 'yumenovel_views';

interface ViewData {
  [key: string]: number;
}

function getStore(): ViewData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(data: ViewData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getNovelViews(novelId: string): number {
  const store = getStore();
  return store[`novel_${novelId}`] || 0;
}

export function incrementNovelView(novelId: string): number {
  const store = getStore();
  const key = `novel_${novelId}`;
  store[key] = (store[key] || 0) + 1;
  saveStore(store);
  return store[key];
}

export function getChapterViews(novelId: string, chapterIndex: number): number {
  const store = getStore();
  return store[`chapter_${novelId}_${chapterIndex}`] || 0;
}

export function incrementChapterView(novelId: string, chapterIndex: number): number {
  const store = getStore();
  const key = `chapter_${novelId}_${chapterIndex}`;
  store[key] = (store[key] || 0) + 1;
  saveStore(store);
  return store[key];
}

export function getTotalViews(): number {
  const store = getStore();
  return Object.entries(store)
    .filter(([key]) => key.startsWith('novel_'))
    .reduce((sum, [, val]) => sum + val, 0);
}

export function getAllNovelViews(): Record<string, number> {
  const store = getStore();
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(store)) {
    if (key.startsWith('novel_')) {
      const novelId = key.replace('novel_', '');
      result[novelId] = val;
    }
  }
  return result;
}
