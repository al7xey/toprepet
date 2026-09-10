export const directions = ['Дошкольники','1–4 классы','5–8 классы','ОГЭ · Информатика','ЕГЭ · Информатика','ОГЭ · Другой предмет','ЕГЭ · Другой предмет','Помогите выбрать'];
export function isContactValid(value:string) {
  return /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(value) || (/^\+?[\d\s()\-]+$/.test(value) && value.replace(/\D/g,'').length >= 10 && value.replace(/\D/g,'').length <= 15);
}
