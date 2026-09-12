export interface Teacher {
  id: string;
  role: string;
  subject: string;
  intro: string;
  achievements: readonly string[];
}

export const teachers: readonly Teacher[] = [
  {
    id: 'informatics',
    role: 'Репетитор по информатике',
    subject: 'Информатика · ОГЭ · ЕГЭ',
    intro:
      'Объясняет код и алгоритмы на понятных примерах, помогает подготовиться к школьным занятиям и экзаменам.',
    achievements: [
      'Имя и анкета преподавателя готовятся',
      'Подтверждённые достижения добавим после согласования',
    ],
  },
  {
    id: 'primary',
    role: 'Репетитор начальных классов',
    subject: '1–4 классы · Домашние задания',
    intro:
      'Помогает понять школьную программу и выстроить спокойный ритм самостоятельной учёбы.',
    achievements: [
      'Имя и анкета преподавателя готовятся',
      'Опыт и специализацию укажем после проверки',
    ],
  },
  {
    id: 'school-subjects',
    role: 'Репетитор по школьным предметам',
    subject: 'Математика · Русский · Английский',
    intro:
      'Проводит регулярные занятия, объясняет сложные темы и помогает с домашними заданиями.',
    achievements: [
      'Имя и анкета преподавателя готовятся',
      'Достижения укажем только после подтверждения',
    ],
  },
] as const;

export function findTeacher(id: string | undefined) {
  return teachers.find((teacher) => teacher.id === id);
}
