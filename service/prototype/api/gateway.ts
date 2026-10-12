/* Test payment gateway. In production these calls go to the acquiring bank (hold → capture / void / refund).
   Test cards: •• 0002 — bank declines (insufficient funds), •• 0069 — card expired,
   •• 0341 — holds succeed but scheduled series charges fail. Payout card •• 0000 — closed card. */

export interface CardInput {
  number: string;
  exp: string;
  cvc: string;
}

export type MethodInput = { kind: 'saved'; cardId: string } | { kind: 'new'; card: CardInput; save: boolean } | { kind: 'sbp' };

export class PaymentDeclined extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function luhn(num: string) {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 16 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): 'Мир' | 'Visa' | 'Mastercard' {
  const d = num.replace(/\D/g, '');
  if (d.startsWith('2')) return 'Мир';
  if (d.startsWith('4')) return 'Visa';
  return 'Mastercard';
}

export function validateCard(card: CardInput) {
  const errors: Partial<Record<keyof CardInput, string>> = {};
  if (!luhn(card.number)) errors.number = 'Проверьте номер карты';
  const m = card.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12) errors.exp = 'Срок в формате ММ/ГГ';
  if (!/^\d{3}$/.test(card.cvc)) errors.cvc = '3 цифры с обратной стороны';
  return errors;
}

/* Authorise (hold) money on a card. Throws PaymentDeclined with a human reason. */
export function authorize(last4: string) {
  if (last4 === '0002') throw new PaymentDeclined(`На карте •• ${last4} недостаточно средств. Деньги не списаны и не заморожены.`);
  if (last4 === '0069') throw new PaymentDeclined(`Срок действия карты •• ${last4} истёк. Деньги не списаны и не заморожены.`);
}

/* Charge a saved card without the cardholder present (series). */
export function chargeSaved(last4: string) {
  if (last4 === '0341' || last4 === '0002') throw new PaymentDeclined(`Банк отклонил списание с карты •• ${last4}`);
}

export function payoutTo(card: string) {
  if (card.replace(/\D/g, '').endsWith('0000')) throw new PaymentDeclined(`Карта ${card.slice(-7)} закрыта`);
}
