import { NB } from './time';

/* The student pays the tutor's price plus the service fee; the tutor always receives their own price. */
export const SERVICE_FEE = 0.1;

export const studentPrice = (tutorPrice: number) => Math.round(tutorPrice * (1 + SERVICE_FEE));
export const serviceFee = (tutorPrice: number) => studentPrice(tutorPrice) - tutorPrice;

export function fmtMoney(value: number) {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(Math.round(value));
  return `${sign}${String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}₽`;
}

export const fmtSigned = (value: number) => (value > 0 ? '+' : '') + fmtMoney(value);

export function parseMoney(input: string) {
  const digits = input.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
