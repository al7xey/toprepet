/* Simple Russian cases for first names in interface phrases: «у Анны», «Анне», «с Анной». */
const CONS = /[бвгджзклмнпрстфхцчшщ]$/;

export function genitive(name: string) {
  if (/ия$/.test(name)) return name.replace(/ия$/, 'ии');
  if (/[гкхжшчщ]а$/.test(name)) return name.replace(/а$/, 'и');
  if (/а$/.test(name)) return name.replace(/а$/, 'ы');
  if (/я$/.test(name)) return name.replace(/я$/, 'и');
  if (/ь$/.test(name)) return name.replace(/ь$/, 'я');
  if (/й$/.test(name)) return name.replace(/й$/, 'я');
  if (CONS.test(name)) return `${name}а`;
  return name;
}

export function dative(name: string) {
  if (/ия$/.test(name)) return name.replace(/ия$/, 'ии');
  if (/[ая]$/.test(name)) return name.replace(/[ая]$/, 'е');
  if (/ь$/.test(name)) return name.replace(/ь$/, 'ю');
  if (/й$/.test(name)) return name.replace(/й$/, 'ю');
  if (CONS.test(name)) return `${name}у`;
  return name;
}

export function instrumental(name: string) {
  if (/ия$/.test(name)) return name.replace(/ия$/, 'ией');
  if (/[жшчщц]а$/.test(name)) return name.replace(/а$/, 'ей');
  if (/а$/.test(name)) return name.replace(/а$/, 'ой');
  if (/я$/.test(name)) return name.replace(/я$/, 'ей');
  if (/ь$/.test(name)) return name.replace(/ь$/, 'ем');
  if (/й$/.test(name)) return name.replace(/й$/, 'ем');
  if (CONS.test(name)) return `${name}ом`;
  return name;
}

export const first = (full: string) => full.trim().split(/\s+/)[0] ?? full;
