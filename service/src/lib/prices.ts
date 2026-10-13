/* Р2.1: lesson lengths and price limits. The 300–20 000 ₽ bounds are an assumption of the spec; the database checks the same. */
export const DURATIONS = [45, 60, 90, 120] as const;
export type Duration = (typeof DURATIONS)[number];
export const PRICE_MIN = 300;
export const PRICE_MAX = 20_000;

export const PRICE_ERROR = 'Цена — целое число от 300 до 20 000 ₽, без копеек.';

/** Parses what the tutor typed: '' means no lesson of this length; spaces and «₽» are ignored. */
export function parsePrice(input: string): { value: number | null; error: string | null } {
  const text = input.replace(/[\s ₽]/g, '');
  if (!text) return { value: null, error: null };
  if (!/^\d+$/.test(text)) return { value: null, error: PRICE_ERROR };
  const value = Number(text);
  if (value < PRICE_MIN || value > PRICE_MAX) return { value: null, error: PRICE_ERROR };
  return { value, error: null };
}

/** Experience in whole years, 0–70; '' means not stated. */
export function parseYears(input: string): { value: number | null; error: string | null } {
  const text = input.trim();
  if (!text) return { value: null, error: null };
  if (!/^\d+$/.test(text) || Number(text) > 70) return { value: null, error: 'Укажите целое число лет от 0 до 70.' };
  return { value: Number(text), error: null };
}
