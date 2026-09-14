export interface Teacher {
  id: string;
  name: string;
  role: string;
  cardLabel: string;
  cardDetail: string;
  cardTicker: readonly string[];
  photo: string;
  subjects: readonly string[];
  intro: string;
  achievements: readonly string[];
}

export const teachers: readonly Teacher[] = [
  {
    id: 'informatics',
    name: 'Иван Иванов',
    role: 'Репетитор по информатике',
    cardLabel: 'Информатика',
    cardDetail: 'ОГЭ, ЕГЭ, домашние задания',
    cardTicker: [
      'Информатика',
      'ЕГЭ по информатике',
      'ОГЭ по информатике',
      'Школьные предметы',
      'Математика',
      'Начальные классы',
      'Домашние задания',
    ],
    photo: '/images/tutor-informatics.png',
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
    cardLabel: 'Английский',
    cardDetail: 'Школьная программа, разговорная практика',
    cardTicker: [
      'Английский',
      'История России',
      'Школьные предметы',
      'Начальные классы',
      'Подготовка к школе',
      'Домашние задания',
    ],
    photo: '/images/tutor-english.png',
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
