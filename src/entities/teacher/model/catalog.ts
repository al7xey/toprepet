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
    name: 'Иван Иванов',
    role: 'Репетитор по информатике',
    subjects: ['Информатика', 'ОГЭ', 'ЕГЭ'],
    intro:
      'Объясняет код и алгоритмы на понятных примерах, помогает подготовиться к школьным занятиям и экзаменам.',
    achievements: [
      'Разбирает задачи от основ до экзаменационного уровня',
      'Подбирает темп и практику под цель ученика',
    ],
  },
  {
    id: 'english',
    name: 'Анна Петрова',
    role: 'Репетитор по английскому',
    subjects: ['Английский', 'Школьная программа', 'Разговорная практика'],
    intro:
      'Помогает уверенно говорить, разбирать школьные темы и заниматься в удобном для ученика темпе.',
    achievements: [
      'Объясняет грамматику через живые примеры и диалог',
      'Собирает план занятий под цель и интересы ученика',
    ],
  },
] as const;

export function findTeacher(id: string | undefined) {
  return teachers.find((teacher) => teacher.id === id);
}
