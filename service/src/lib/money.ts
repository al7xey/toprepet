import { NB } from './time';

/* Whole rubles with non-breaking thin grouping: «2 000 ₽». */
export function fmtMoney(value: number) {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(Math.round(value));
  return `${sign}${String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}₽`;
}

export function parseMoney(input: string) {
  const digits = input.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
