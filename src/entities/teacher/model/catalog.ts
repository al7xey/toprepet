export interface Teacher {
  id: string;
  name: string;
  role: string;
  subjects: readonly string[];
  intro: string;
  achievements: readonly string[];
}

export const teachers: readonly Teacher[] = [
  {
    id: 'informatics',
    name: 'Иванов Иван',
    role: 'Репетитор по информатике',
    subjects: ['Информатика', 'ОГЭ', 'ЕГЭ'],
    intro:
      'Объясняет код и алгоритмы на понятных примерах, помогает подготовиться к школьным занятиям и экзаменам.',
    achievements: [
      'Информация об опыте скоро появится',
      'Подтверждённые достижения добавим после согласования',
    ],
  },
  {
    id: 'primary',
    name: 'Иванов Иван',
    role: 'Репетитор начальных классов',
    subjects: ['1–4 классы', 'Домашние задания'],
    intro:
      'Помогает понять школьную программу и выстроить спокойный ритм самостоятельной учёбы.',
    achievements: [
      'Информация об опыте скоро появится',
      'Опыт и специализацию укажем после проверки',
    ],
  },
  {
    id: 'school-subjects',
    name: 'Иванов Иван',
    role: 'Репетитор по школьным предметам',
    subjects: ['Математика', 'Русский', 'Английский'],
    intro:
      'Проводит регулярные занятия, объясняет сложные темы и помогает с домашними заданиями.',
    achievements: [
      'Информация об опыте скоро появится',
      'Достижения укажем только после подтверждения',
    ],
  },
] as const;

export function findTeacher(id: string | undefined) {
  return teachers.find((teacher) => teacher.id === id);
}
