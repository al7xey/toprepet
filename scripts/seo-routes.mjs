export const routes = [
  '/',
  '/lessons',
  '/contact',
  '/free-intro',

  '/teacher/informatics',
  '/teacher/english',
  '/teacher/russian',
  '/teacher/chemistry-biology',
  '/teacher/mathematics',
];

export const titles = {
  '/':
    'TopRepet — топ репетиторы под вашу цель',

  '/lessons':
    'Занятия с репетитором — TopRepet',

  '/contact':
    'Связаться с TopRepet',

  '/free-intro':
    'Бесплатное знакомство с репетитором — TopRepet',

  '/teacher/informatics':
    'Алексей — репетитор по информатике | TopRepet',

  '/teacher/english':
    'Анастасия — репетитор по английскому и истории | TopRepet',

  '/teacher/russian':
    'Артём — репетитор по русскому языку | TopRepet',

  '/teacher/chemistry-biology':
    'Александра — репетитор по химии и биологии | TopRepet',

  '/teacher/mathematics':
    'Ерлан — репетитор по математике | TopRepet',
};

export const descriptions = {
  '/':
    'Подберём репетитора под вашу цель: школьные предметы, домашние задания, ОГЭ и ЕГЭ. Бесплатное знакомство на 20 минут и индивидуальный план занятий.',

  '/lessons':
    'Выберите направление занятий в TopRepet: школьные предметы, домашние задания, подготовка к ОГЭ и ЕГЭ и начало учёбы.',

  '/contact':
    'Свяжитесь с менеджером TopRepet, чтобы выбрать занятие, преподавателя или согласовать время бесплатного знакомства.',

  '/free-intro':
    'Бесплатное знакомство с репетитором длится 20 минут. Обсудим цель, удобный график и составим план занятий.',

  '/teacher/informatics':
    'Алексей — репетитор TopRepet по информатике, школьной программе, ОГЭ и ЕГЭ.',

  '/teacher/english':
    'Анастасия — репетитор TopRepet по английскому языку, истории и школьным предметам.',

  '/teacher/russian':
    'Артём — репетитор TopRepet по русскому языку, школьной программе и подготовке к ОГЭ.',

  '/teacher/chemistry-biology':
    'Александра — репетитор TopRepet по химии и биологии для учеников 5–11 классов и подготовки к ОГЭ.',

  '/teacher/mathematics':
    'Ерлан — репетитор TopRepet по математике, школьной программе и подготовке к ОГЭ.',
};


export const canonicalForRoute = route => route === '/' ? 'https://toprepet.ru/' : `https://toprepet.ru${route}/`;
