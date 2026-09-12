export const PRICE = 1200;
export const PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PRICE) + ' ₽';
export const TELEGRAM_URL = 'https://t.me/a17xey';
export function telegramLink(topic?: string) {
  if (!topic) return TELEGRAM_URL;
  const details = topic.replaceAll(' · ', '\n');
  const message = [
    'Здравствуйте!',
    '',
    'Хочу записаться на занятие в TopRepet.',
    details,
    '',
    'Первое занятие бесплатно.',
  ].join('\n');
  return `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
}
