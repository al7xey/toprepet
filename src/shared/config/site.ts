export const PRICE = 1200;
export const PRICE_LABEL = new Intl.NumberFormat('ru-RU').format(PRICE) + ' ₽';
export const TELEGRAM_URL = 'https://t.me/a17xey';
export function telegramLink(topic?: string) {
  return topic
    ? `${TELEGRAM_URL}?text=${encodeURIComponent(`Здравствуйте! Интересуют занятия TopRepet: ${topic}. Хочу начать с бесплатного знакомства.`)}`
    : TELEGRAM_URL;
}
