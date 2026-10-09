import { teachers } from '../../entities/teacher';
import { PRICE_LABEL } from '../../shared/config/site';
import teacherPhotos from '../../shared/config/teacher-photos.json';
import { routes, type Direction, type TeacherCardData } from '../../shared/ui/kit';

/* «Выберите занятия»: 8 directions in the mockup's order (column by column, two rows). */
export const directions: readonly Direction[] = [
  { tone: 'orange', audience: '1–11 класс', title: 'По предметам', text: 'Школьная программа, пробелы и оценки', to: `${routes.lessons}?goal=subject` },
  { tone: 'sand', audience: '1–11 класс', title: 'Домашние задания', text: 'Разберём задания и научим делать самому', to: `${routes.lessons}?goal=homework` },
  { tone: 'indigo', audience: '8–11 класс', title: 'ОГЭ и ЕГЭ', text: 'План подготовки к экзамену', to: `${routes.lessons}?goal=exam` },
  { tone: 'green', audience: 'До школы', title: 'Начало учёбы', text: 'Чтение, письмо и счёт', to: `${routes.lessons}?goal=foundation` },
  { tone: 'teal', audience: 'Взрослым', title: 'Языки', text: 'Английский, немецкий, разговорная практика', to: routes.teachers },
  { tone: 'orange', audience: 'Взрослым', title: 'Работа и карьера', text: 'Собеседования, Python, Excel, дизайн', to: routes.teachers },
  { tone: 'plum', audience: 'Студентам', title: 'Высшее образование', text: 'Высшая математика, сессия, курсовые', to: routes.teachers },
  { tone: 'sand', audience: 'Любой возраст', title: 'Хобби и творчество', text: 'Музыка, рисование, шахматы', to: routes.teachers },
];

export const steps = [
  ['Поставьте цель', 'Опишите, что хотите изучать'],
  ['Выберите репетитора', 'Сравните анкеты, цены и отзывы'],
  ['Познакомьтесь бесплатно', '20 минут, без оплаты'],
  ['Занимайтесь по плану', 'Уроки онлайн в удобное время'],
] as const;

const photos = teacherPhotos as Record<string, { srcSet?: string }>;

/* The catalogue has no ratings yet, so the plate shows experience in the rating's place
   (see docs/figma-implementation.md). Price is the site's current lesson price. */
export const teacherCards: readonly TeacherCardData[] = teachers.map((teacher) => ({
  id: teacher.id,
  name: teacher.name,
  subjects: teacher.cardSubjects,
  meta: `${teacher.name} · ${teacher.experience}`,
  price: `от ${PRICE_LABEL}`,
  photo: teacher.photo,
  photoSrcSet: photos[teacher.id]?.srcSet,
  to: routes.teacher(teacher.id),
}));
