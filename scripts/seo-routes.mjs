export const routes = [
  '/',
  '/lessons',
  '/contact',
  '/free-intro',
  '/for-repetitor',
  '/teachers',

  '/teacher/informatics',
  '/teacher/english',
  '/teacher/russian',
  '/teacher/chemistry-biology',
  '/teacher/mathematics',
  '/teacher/russian-literature',
];

export const titles = {
  '/':
    'TopRepet — найдите репетитора под свою цель',

  '/lessons':
    'Занятия с репетитором — TopRepet',

  '/contact':
    'Связаться с TopRepet',

  '/free-intro':
    'Бесплатное знакомство с репетитором — TopRepet',

  '/for-repetitor':
    'Работа репетитором онлайн — комиссия 200 ₽ | TopRepet',

  '/teachers':
    'Преподаватели TopRepet — выбрать репетитора по предмету',

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

  '/teacher/russian-literature':
    'Анна — репетитор по русскому языку и литературе | TopRepet',
};

export const descriptions = {
  '/':
    'Выберите репетитора для школьных предметов, ОГЭ и ЕГЭ. Первое знакомство — 20 минут бесплатно.',

  '/lessons':
    'Выберите направление занятий в TopRepet: школьные предметы, домашние задания, подготовка к ОГЭ и ЕГЭ и начало учёбы.',

  '/contact':
    'Свяжитесь с менеджером TopRepet, чтобы выбрать занятие, преподавателя или согласовать время бесплатного знакомства.',

  '/free-intro':
    'Бесплатное знакомство с репетитором длится 20 минут. Обсудим цель, удобный график и составим план занятий.',

  '/for-repetitor':
    'Работа репетитором онлайн с TopRepet. Получайте новых учеников через сервис. Комиссия — 200 ₽ с занятия, преподаватель получает 1 000 ₽. Начните сотрудничество с TopRepet.',

  '/teachers':
    'Выберите репетитора TopRepet по предмету и задаче: школьная программа, домашние задания, ОГЭ или ЕГЭ. Посмотрите анкеты преподавателей и найдите подходящего.',

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

  '/teacher/russian-literature':
    'Анна — учитель русского языка и литературы. Занятия для 5–11 классов, подготовка к ОГЭ и ЕГЭ. Результат ЕГЭ по русскому — 98 баллов.',
};


export const canonicalForRoute = route => route === '/' ? 'https://toprepet.ru/' : `https://toprepet.ru${route}/`;
