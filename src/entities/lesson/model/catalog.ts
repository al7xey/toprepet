export const goals = [
  { id: 'subject', label: 'По предметам' },
  { id: 'homework', label: 'Домашние задания' },
  { id: 'exam', label: 'ОГЭ и ЕГЭ' },
  { id: 'foundation', label: 'Начало учёбы' },
] as const;
export type Goal = (typeof goals)[number]['id'];
export const subjects = [
  'Математика',
  'Русский язык',
  'Английский язык',
  'Информатика',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'Обществознание',
  'География',
  'Литература',
  'Другой предмет',
] as const;
export const foundationSubjects = [
  'Подготовка к школе',
  'Начальные классы',
] as const;
export const exams = ['ОГЭ', 'ЕГЭ'] as const;
export const examSubjects = ['Информатика'] as const;
export const isGoal = (value: unknown): value is Goal =>
  goals.some((item) => item.id === value);
export interface LessonSelection {
  goal: Goal;
  subject: string;
  grade: string;
  exam: string;
  promoCode: string;
}
export const initialSelection: LessonSelection = {
  goal: 'subject',
  subject: '',
  grade: '',
  exam: 'ОГЭ',
  promoCode: '',
};
export function availableGrades(goal: Goal, subject: string) {
  if (goal === 'foundation')
    return subject === 'Подготовка к школе'
      ? ['До школы']
      : ['1', '2', '3', '4'];
  return Array.from({ length: 11 }, (_, i) => String(i + 1));
}
export function selectionDescription(s: LessonSelection) {
  const lines: string[] = [`Направление: ${goals.find((g) => g.id === s.goal)!.label}`];
  if (s.subject) lines.push(`Предмет: ${s.subject}`);
  if (s.goal === 'exam') lines.push(`Экзамен: ${s.exam}`);
  if (s.grade) lines.push(`Класс: ${s.grade === 'До школы' ? s.grade : s.grade + ' класс'}`);
  if (s.promoCode.trim()) lines.push(`Промокод: ${s.promoCode.trim()}`);
  return lines.join('\n');
}
export const legacyGoal: Record<string, Goal> = {
  'school-start': 'foundation',
  primary: 'foundation',
  'school-program': 'subject',
  homework: 'homework',
  subjects: 'subject',
  oge: 'exam',
  ege: 'exam',
};
