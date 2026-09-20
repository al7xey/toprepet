export const PRICE = 1200;
export const PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PRICE) + ' ₽';
export const PROMO_PRICE = 900;
export const PROMO_PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PROMO_PRICE) + ' ₽';
const DISCOUNT_PROMO_CODES = new Set(['ОСЕНЬ', 'ЮТАНОВО']);

export function normalizePromoCode(value: string) {
  return value.trim().toLocaleUpperCase('ru-RU');
}

export function isDiscountPromoCode(value: string) {
  return DISCOUNT_PROMO_CODES.has(normalizePromoCode(value));
}

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
