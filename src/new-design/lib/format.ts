/** Форматирование для интерфейса: деньги, даты, время, склонения. Всё по-русски и с неразрывными пробелами. */

const nbsp = (s: string) => s.replace(/\s/g, ' ');

export const rub = (value: number) => `${nbsp(new Intl.NumberFormat('ru-RU').format(value))} ₽`;
export const fromRub = (value: number) => `от ${rub(value)}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const d = (value: string | Date) => (typeof value === 'string' ? new Date(value) : value);

/** «Чт 16 окт» */
export const dayLabel = (value: string | Date) => {
  const date = d(value);
  const wd = date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
  const month = date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  return `${cap(wd)} ${date.getDate()} ${month}`;
};
/** «19:00» */
export const timeLabel = (value: string | Date) => d(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
/** «Чт 16 окт, 19:00» */
export const whenLabel = (value: string | Date) => `${dayLabel(value)}, ${timeLabel(value)}`;
/** «16 октября 2026» */
export const dateLong = (value: string | Date) => d(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
/** «2 часа назад», «вчера», «16 окт» */
export const ago = (value: string | Date) => {
  const diff = Date.now() - d(value).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} ${plural(min, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  if (h < 48) return 'вчера';
  return dayLabel(value);
};
/** Время до события: «через 2 часа», «через 3 дня». */
export const until = (value: string | Date) => {
  const min = Math.round((d(value).getTime() - Date.now()) / 60_000);
  if (min <= 0) return 'сейчас';
  if (min < 60) return `через ${min} ${plural(min, 'минуту', 'минуты', 'минут')}`;
  const h = Math.round(min / 60);
  if (h < 24) return `через ${h} ${plural(h, 'час', 'часа', 'часов')}`;
  const days = Math.round(h / 24);
  return `через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
};

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export const count = (n: number, one: string, few: string, many: string) => `${n} ${plural(n, one, few, many)}`;

/** Длительность: «60 минут», «1,5 часа». */
export const minutes = (n: number) => (n === 90 ? '1,5 часа' : count(n, 'минута', 'минуты', 'минут'));

/** Первая буква имени для аватара без фото. */
export const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '•';
