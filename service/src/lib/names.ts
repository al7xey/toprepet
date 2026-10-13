/* Simple Russian cases for first names in interface phrases: «у Анны», «Анне», «с Анной». */
const CONS = /[бвгджзклмнпрстфхцчшщ]$/;

export function genitive(name: string) {
  if (name.endsWith('ия')) return name.replace(/ия$/, 'ии');
  if (/[гкхжшчщ]а$/.test(name)) return name.replace(/а$/, 'и');
  if (name.endsWith('а')) return name.replace(/а$/, 'ы');
  if (name.endsWith('я')) return name.replace(/я$/, 'и');
  if (name.endsWith('ь')) return name.replace(/ь$/, 'я');
  if (name.endsWith('й')) return name.replace(/й$/, 'я');
  if (CONS.test(name)) return `${name}а`;
  return name;
}

export function dative(name: string) {
  if (name.endsWith('ия')) return name.replace(/ия$/, 'ии');
  if (/[ая]$/.test(name)) return name.replace(/[ая]$/, 'е');
  if (name.endsWith('ь')) return name.replace(/ь$/, 'ю');
  if (name.endsWith('й')) return name.replace(/й$/, 'ю');
  if (CONS.test(name)) return `${name}у`;
  return name;
}

export function instrumental(name: string) {
  if (name.endsWith('ия')) return name.replace(/ия$/, 'ией');
  if (/[жшчщц]а$/.test(name)) return name.replace(/а$/, 'ей');
  if (name.endsWith('а')) return name.replace(/а$/, 'ой');
  if (name.endsWith('я')) return name.replace(/я$/, 'ей');
  if (name.endsWith('ь')) return name.replace(/ь$/, 'ем');
  if (name.endsWith('й')) return name.replace(/й$/, 'ем');
  if (CONS.test(name)) return `${name}ом`;
  return name;
}

export const first = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/* Men's names ending in -а/-я take the masculine past tense: «Никита подтвердил». */
const MALE_A = new Set(['Никита', 'Илья', 'Кузьма', 'Лука', 'Фома', 'Савва', 'Данила', 'Гаврила', 'Миша', 'Дима', 'Петя', 'Ваня', 'Паша', 'Лёша', 'Алёша', 'Серёжа', 'Коля', 'Витя', 'Вова', 'Слава']);

/** Past tense by the first name: «Анна подтвердила», «Дмитрий подтвердил». Names ending in -а/-я are read as female unless known as male. */
export function past(name: string, masc: string, fem: string) {
  return /[ая]$/.test(name) && !MALE_A.has(name) ? fem : masc;
}
