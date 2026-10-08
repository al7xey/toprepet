import type { StudentCategory, Tone } from './types';

/* Directions on the home page and in the student's onboarding («Какая помощь нужна?»). */
export interface Direction {
  id: string;
  title: string;
  ages: string;
  text: string;
  tone: Tone;
  subjects: string[];
}

export const DIRECTIONS: Direction[] = [
  { id: 'school', title: 'По предметам', ages: '1–11 класс', text: 'Школьная программа, пробелы и оценки', tone: 'orange', subjects: ['Математика', 'Русский язык', 'Английский язык', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Обществознание', 'География'] },
  { id: 'homework', title: 'Домашние задания', ages: '1–11 класс', text: 'Разберём задания и научим делать самому', tone: 'sand', subjects: ['Математика', 'Русский язык', 'Английский язык', 'Физика', 'Химия'] },
  { id: 'exam', title: 'ОГЭ и ЕГЭ', ages: '8–11 класс', text: 'План подготовки к экзамену', tone: 'indigo', subjects: ['Математика', 'Русский язык', 'Информатика', 'Физика', 'Химия', 'Биология', 'История', 'Обществознание', 'Литература', 'Английский язык'] },
  { id: 'start', title: 'Начало учёбы', ages: 'До школы', text: 'Чтение, письмо и счёт', tone: 'green', subjects: ['Подготовка к школе', 'Начальные классы'] },
  { id: 'languages', title: 'Языки', ages: 'Взрослым', text: 'Английский, немецкий, разговорная практика', tone: 'teal', subjects: ['Английский язык', 'Немецкий язык', 'Русский как иностранный'] },
  { id: 'career', title: 'Работа и карьера', ages: 'Взрослым', text: 'Собеседования, Python, Excel, дизайн', tone: 'orange', subjects: ['Английский язык', 'Python', 'Excel', 'Дизайн'] },
  { id: 'university', title: 'Высшее образование', ages: 'Студентам', text: 'Высшая математика, сессия, курсовые', tone: 'plum', subjects: ['Высшая математика', 'Физика', 'Химия', 'Программирование'] },
  { id: 'hobby', title: 'Хобби и творчество', ages: 'Любой возраст', text: 'Музыка, рисование, шахматы', tone: 'sand', subjects: ['Гитара', 'Рисование', 'Шахматы'] },
];

export const directionById = (id: string | null | undefined) => DIRECTIONS.find(d => d.id === id);

/* Subject reference book used by tutors' profiles, requests and search. */
export const SUBJECTS = [
  'Математика',
  'Русский язык',
  'Английский язык',
  'Немецкий язык',
  'Информатика',
  'Python',
  'Программирование',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'Обществознание',
  'Литература',
  'География',
  'Высшая математика',
  'Подготовка к школе',
  'Начальные классы',
  'Русский как иностранный',
  'Excel',
  'Дизайн',
  'Гитара',
  'Рисование',
  'Шахматы',
];

/* Goals offered per subject; a generic set covers everything else. */
const SCHOOL_GOALS = ['Школьная программа', 'Домашние задания', 'ОГЭ', 'ЕГЭ', 'Олимпиады'];
export const SUBJECT_GOALS: Record<string, string[]> = {
  'Английский язык': ['Школьная программа', 'ОГЭ', 'ЕГЭ', 'Разговорный', 'Собеседование', 'Деловой', 'IELTS', 'Для путешествий'],
  'Немецкий язык': ['Школьная программа', 'Разговорный', 'Деловой', 'Goethe-Zertifikat'],
  Python: ['С нуля', 'Анализ данных', 'Для работы', 'ЕГЭ'],
  Программирование: ['С нуля', 'Для работы', 'Курсовые'],
  'Высшая математика': ['Сессия', 'Курсовые', 'Теория вероятностей'],
  'Подготовка к школе': ['Чтение', 'Письмо', 'Счёт'],
  'Начальные классы': ['Школьная программа', 'Домашние задания', 'ВПР'],
  Excel: ['С нуля', 'Для работы'],
  Дизайн: ['Фигма', 'Портфолио'],
  Гитара: ['С нуля', 'Для себя'],
  Рисование: ['С нуля', 'Для себя'],
  Шахматы: ['С нуля', 'Турниры'],
};
export const goalsFor = (subject: string) => SUBJECT_GOALS[subject] ?? SCHOOL_GOALS;

export const STUDENT_CATEGORIES: StudentCategory[] = ['Дошкольники', 'Школьники', 'Студенты', 'Взрослые'];

/* Short subject name for cards: «Английский язык» → «Английский». */
export const shortSubject = (s: string) => s.replace(/ язык$/, '').replace('Русский как иностранный', 'РКИ');

export const LEVELS = ['Начинаю с нуля', 'Базовый', 'Средний', 'Продвинутый'];
export const LANGUAGE_LEVELS = ['Начинаю с нуля', 'A2', 'B1', 'B2 и выше'];
export const isLanguage = (s: string) => /язык|иностранный/.test(s);

export const ONLINE_SERVICES = ['Телемост', 'Zoom', 'Google Meet', 'Другое'];

export const DURATIONS = [45, 60, 90];
export const INTRO_MINUTES = [15, 20, 30];

export const TIME_BUCKETS = [
  { id: 'weekday-morning', label: 'Будни утром', from: 8, to: 12, weekend: false },
  { id: 'weekday-day', label: 'Будни днём', from: 12, to: 17, weekend: false },
  { id: 'weekday-evening', label: 'Будни вечером', from: 17, to: 23, weekend: false },
  { id: 'weekend', label: 'Выходные', from: 8, to: 23, weekend: true },
] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number]['id'];

export const FREQUENCIES = ['1 раз в неделю', '2 раза в неделю', '3 и больше'];
export const BUDGETS: { label: string; value: number | null }[] = [
  { label: 'до 1 200 ₽', value: 1200 },
  { label: 'до 1 800 ₽', value: 1800 },
  { label: 'до 2 500 ₽', value: 2500 },
  { label: 'Не важно', value: null },
];

/* Search suggestions: subject + goal pairs, then subjects. */
export function suggestions(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { pairs: [] as { subject: string; goal: string }[], subjects: [] as string[] };
  const words = q.split(/\s+/);
  const subjects = SUBJECTS.filter(s => words.some(w => w.length >= 3 && s.toLowerCase().startsWith(w.slice(0, Math.max(3, w.length - 2)))) || s.toLowerCase().includes(q));
  const pairs: { subject: string; goal: string }[] = [];
  for (const s of subjects.slice(0, 2)) {
    const goals = goalsFor(s);
    const rest = words.filter(w => !s.toLowerCase().startsWith(w.slice(0, 3)));
    const matched = goals.filter(g => rest.some(w => w.length >= 3 && g.toLowerCase().includes(w.slice(0, 4))));
    for (const g of (matched.length ? matched : goals).slice(0, 3)) pairs.push({ subject: s, goal: g });
  }
  return { pairs: pairs.slice(0, 4), subjects: subjects.slice(0, 4) };
}
