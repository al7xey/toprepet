/* Profile address from the tutor's name: «Анна Ковалёва» → «anna-kovaleva». Self-contained for unit tests. */
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugFromName(name: string) {
  const latin = name.toLowerCase().replace(/[а-яё]/g, ch => MAP[ch] ?? ch);
  const slug = latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return slug.length >= 3 ? slug : `tutor${slug ? `-${slug}` : ''}`;
}

/** The same address with a short random tail, for when the plain one is taken. */
export function slugWithSuffix(base: string, random = Math.random) {
  const tail = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  return `${base}-${tail}`;
}
