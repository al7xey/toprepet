import { NB } from './time';

/* Keep numbers glued to ₽ and units, and thousands together, like the mockup's nb(). */
export function nb(s: string) {
  return String(s)
    .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`)
    .replace(/(\d) (₽|мин|ч|часа|часов|час|дн|дня|дней|окт|ноя|лет|года|год|%)(?![а-яё])/g, `$1${NB}$2`);
}

export function uid(prefix = '') {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return prefix + rnd[0].toString(36) + rnd[1].toString(36).slice(0, 4);
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .split('')
    .map(ch => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/* Contacts in chat: phones, e-mails, messenger handles and links. */
const CONTACT_RE = [
  /(?:\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g,
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  /(?:t\.me|wa\.me|vk\.com|telegram\.me|instagram\.com)\/[\w./-]+/gi,
  /(?:^|\s)@[a-z0-9_]{4,}/gi,
];

export function findContacts(text: string) {
  return CONTACT_RE.some(re => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

export function maskContacts(text: string) {
  return CONTACT_RE.reduce((acc, re) => acc.replace(re, m => (m.startsWith(' ') ? ' ' : '') + '[контакт скрыт]'), text);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}${NB}Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}${NB}КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')}${NB}МБ`;
}

export function fileExt(name: string) {
  return (name.split('.').pop() ?? '').toUpperCase();
}
