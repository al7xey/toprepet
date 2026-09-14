export const PRICE = 1200;
export const PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PRICE) + ' ₽';
export const TELEGRAM_URL = 'https://t.me/toprepet_manager';
export function enquiryMessage(topic?: string) {
  return [
    'Здравствуйте!',
    '',
    'Хочу записаться на бесплатное знакомство в TopRepet.',
    topic || 'Помогите подобрать занятия для ребёнка.',
    '',
    'Давайте обсудим цель, индивидуальный план и удобное время.',
  ].join('\n');
}
export function telegramLink(topic?: string) {
  return `${TELEGRAM_URL}?text=${encodeURIComponent(enquiryMessage(topic))}`;
}
