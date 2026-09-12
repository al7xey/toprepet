export const PRICE = 1200;
export const PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PRICE) + ' ₽';
export const TELEGRAM_URL = 'https://t.me/a17xey';
export const managerContacts = [
  { id: 'telegram', label: 'Telegram', href: TELEGRAM_URL, available: true },
  { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/', available: false },
  { id: 'vk', label: 'VK', href: 'https://vk.com/', available: false },
  { id: 'max', label: 'MAX', href: 'https://max.ru/', available: false },
] as const;
export function telegramLink(topic?: string) {
  if (!topic) return TELEGRAM_URL;
  const details = topic.replaceAll(' · ', '\n');
  const message = [
    'Здравствуйте!',
    '',
    'Хочу записаться на занятие в TopRepet.',
    details,
    '',
    'Бесплатное знакомство: 20 минут и индивидуальный план.',
  ].join('\n');
  return `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
}
