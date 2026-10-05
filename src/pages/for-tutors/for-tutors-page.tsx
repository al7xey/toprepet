import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { subjects } from '../../entities/lesson';
import { MessengerLinks } from '../../shared/ui/messenger-links';
import { Teachers } from '../../widgets/teachers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';

const directions = ['Школьная программа', 'Домашние задания', 'ОГЭ', 'ЕГЭ', 'Начальные классы', 'Подготовка к школе'];
const experienceOptions = ['До 1 года', '1–3 года', '3–5 лет', 'Более 5 лет'];
const tutorQuestions = [
  {
    question: 'Что делает TopRepet, а что — репетитор?',
    answer: 'TopRepet помогает ученикам найти преподавателя, показывает анкеты и помогает согласовать знакомство и расписание. Индивидуальное занятие проводит выбранный репетитор: он объясняет материал, разбирает задания и подбирает подход к цели ученика.',
  },
  {
    question: 'Как появляются ученики?',
    answer: 'Ученик выбирает предмет, задачу и преподавателя на сайте или обращается к менеджеру. Менеджер помогает уточнить запрос и связаться с подходящим репетитором. Количество обращений заранее не обещаем: оно зависит от спроса, предмета и доступного времени.',
  },
  {
    question: 'Как оформляется сотрудничество?',
    answer: 'Репетитор самостоятельно проводит занятия. До начала сотрудничества согласуются договор, расчёты и обмен документами. Подходящий налоговый статус зависит от обстоятельств преподавателя; статус самозанятого не является универсальным требованием. Реквизиты владельца и условия размещаются в разделе документов.',
  },
  {
    question: 'Как учитывается доход самозанятого?',
    answer: 'Если репетитор применяет НПД, он учитывает доход и формирует чеки по правилам этого режима. Получатель чека и документы определяются утверждённой договорной схемой. TopRepet не заменяет индивидуальную проверку налоговых обязанностей; порядок документов согласуется до начала работы.',
  },
  {
    question: 'Какая комиссия и сколько получает репетитор?',
    answer: 'По базовому тарифу клиент оплачивает 1 200 ₽ через TopRepet. После проведённого занятия репетитор получает 1 000 ₽; комиссия сервиса составляет 200 ₽, около 16,7% стоимости. Условия расчётов и применимых скидок согласуются до начала сотрудничества.',
  },
  {
    question: 'Когда поступает выплата?',
    answer: 'Выплата производится после фактически проведённого занятия. Конкретный срок, способ выплаты и порядок подтверждения занятия согласуются с менеджером до начала работы.',
  },
  {
    question: 'Сколько длится занятие?',
    answer: 'Одно индивидуальное занятие длится 60 минут. До первого платного занятия ученик может бесплатно познакомиться с преподавателем в течение 20 минут и обсудить свою цель.',
  },
  {
    question: 'Что происходит на бесплатном знакомстве?',
    answer: 'Ученик и репетитор знакомятся, обсуждают текущие трудности, цель, удобное время и возможный план занятий. Знакомство длится 20 минут и не является оплачиваемым часовым занятием.',
  },
  {
    question: 'Кто составляет план занятий?',
    answer: 'Репетитор предлагает индивидуальный план с учётом цели и уровня ученика. На занятиях можно разбирать школьную программу, домашние задания или готовиться к ОГЭ и ЕГЭ. TopRepet помогает найти преподавателя, а не задаёт единую обязательную программу обучения для всех.',
  },
  {
    question: 'Кто определяет расписание и как перенести занятие?',
    answer: 'Репетитор сообщает удобное время, затем расписание согласуется с учеником. Если занятие нужно перенести, сообщите менеджеру заранее: он поможет согласовать новое время с обеими сторонами.',
  },
  {
    question: 'Можно ли преподавать несколько предметов?',
    answer: 'Да. Укажите предметы и направления, по которым действительно готовы проводить занятия. Это поможет ученикам и менеджеру понять, какие запросы вам подходят.',
  },
] as const;
const tutorFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: tutorQuestions.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function MessageBuilder() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [otherSubject, setOtherSubject] = useState('');
  const [otherDirection, setOtherDirection] = useState('');
  const messageSubjects = selectedSubjects.map(subject => subject === 'Другое' && otherSubject.trim() ? otherSubject.trim() : subject);
  const messageDirections = selectedDirections.map(direction => direction === 'Другое' && otherDirection.trim() ? otherDirection.trim() : direction);
  const message = [
    'Здравствуйте! Хочу сотрудничать с TopRepet как репетитор.',
    '',
    `Предметы: ${messageSubjects.length ? messageSubjects.join(', ') : 'не выбраны'}`,
    `Направления: ${messageDirections.length ? messageDirections.join(', ') : 'не выбраны'}`,
    ...(experience ? [`Опыт: ${experience}`] : []),
    '',
    'Хочу обсудить условия сотрудничества.',
  ].join('\n');

  return (
    <section className="container for-tutors-section tutor-application" id="application" aria-labelledby="tutor-application-title">
      <h2 id="tutor-application-title">Хотите получать учеников через TopRepet?</h2>
      <p>Ответьте на несколько вопросов — мы подготовим сообщение менеджеру.</p>
      <p className="tutor-legal-links"><Link to="/legal/tutor-terms/">Условия сотрудничества</Link> · <Link to="/legal/tutor-public-data-consent/">Отдельное согласие на публикацию анкеты</Link> · <Link to="/legal/privacy/">Обработка данных</Link></p>
      <div className="tutor-choice-group">
        <h3>Что вы преподаёте?</h3>
        <div className="tutor-chips choice-group">
          {subjects.filter(subject => subject !== 'Другой предмет').map(subject => (
            <button key={subject} type="button" className={'choice-option tutor-chip' + (selectedSubjects.includes(subject) ? ' is-selected' : '')} aria-pressed={selectedSubjects.includes(subject)} onClick={() => setSelectedSubjects(toggle(selectedSubjects, subject))}>{subject}</button>
          ))}
          <button type="button" className={'choice-option tutor-chip' + (selectedSubjects.includes('Другое') ? ' is-selected' : '')} aria-pressed={selectedSubjects.includes('Другое')} onClick={() => setSelectedSubjects(toggle(selectedSubjects, 'Другое'))}>Другое</button>
        </div>
        {selectedSubjects.includes('Другое') && <label className="tutor-other-field">Укажите предмет<input className="ym-disable-keys" type="text" value={otherSubject} onChange={event => setOtherSubject(event.target.value)} placeholder="Ваш предмет" maxLength={80} /></label>}
      </div>
      <div className="tutor-choice-group">
        <h3>С какими задачами работаете?</h3>
        <div className="tutor-chips choice-group">
          {directions.map(direction => (
            <button key={direction} type="button" className={'choice-option tutor-chip' + (selectedDirections.includes(direction) ? ' is-selected' : '')} aria-pressed={selectedDirections.includes(direction)} onClick={() => setSelectedDirections(toggle(selectedDirections, direction))}>{direction}</button>
          ))}
          <button type="button" className={'choice-option tutor-chip' + (selectedDirections.includes('Другое') ? ' is-selected' : '')} aria-pressed={selectedDirections.includes('Другое')} onClick={() => setSelectedDirections(toggle(selectedDirections, 'Другое'))}>Другое</button>
        </div>
        {selectedDirections.includes('Другое') && <label className="tutor-other-field">Укажите задачу<input className="ym-disable-keys" type="text" value={otherDirection} onChange={event => setOtherDirection(event.target.value)} placeholder="С какими задачами работаете" maxLength={120} /></label>}
      </div>
      <div className="tutor-choice-group">
        <h3>Опыт преподавания</h3>
        <div className="tutor-chips choice-group">
          {experienceOptions.map(option => (
            <button key={option} type="button" className={'choice-option tutor-chip' + (experience === option ? ' is-selected' : '')} aria-pressed={experience === option} onClick={() => setExperience(experience === option ? '' : option)}>{option}</button>
          ))}
        </div>
      </div>
      <div className="tutor-contact">
        <h3>Написать менеджеру</h3>
        <p>Выберите удобный мессенджер и напишите нам.</p>
        <p>Среднее время ответа — 7 минут.</p>
        <MessengerLinks preparedMessage={message} />
        <p className="tutor-contact-note">В Telegram и WhatsApp сообщение уже заполнено. При нажатии на VK или MAX текст копируется — останется вставить его в диалог.</p>
      </div>
    </section>
  );
}

export default function ForTutorsPage() {
  return (
    <article className="for-tutors-page">
      <header className="container tutor-page-heading"><div className="tutor-hero-copy"><h1>Работай репетитором онлайн с <span>TopRepet</span></h1><a className="button button-primary tutor-hero-cta" href="#application">Стать топ репетитором <ArrowRight size={20} aria-hidden="true" /></a></div><img className="tutor-hero-image" src="/images/for-repetitor-hero-1200.webp" srcSet="/images/for-repetitor-hero-640.webp 640w, /images/for-repetitor-hero-1200.webp 1200w" sizes="(min-width: 760px) min(560px, calc((100vw - 104px) / 2)), calc(100vw - 28px)" alt="Команда преподавателей TopRepet" width="1200" height="900" loading="eager" fetchPriority="high" decoding="async" /></header>
      <section className="container for-tutors-section tutor-value" aria-labelledby="tutor-value-title">
        <div className="tutor-value-intro"><h2 id="tutor-value-title">Вы преподаёте. Мы помогаем найти учеников.</h2><p>TopRepet — сервис для репетиторов и учеников. Мы привлекаем запросы на занятия и помогаем подобрать преподавателя под цель ученика.</p></div>
        <div className="tutor-value-list"><div><Check aria-hidden="true" /><h3>Новые ученики</h3><p>Вашу анкету увидят ученики, которым подходит ваш предмет и формат занятий.</p></div><div><Check aria-hidden="true" /><h3>Понятная комиссия</h3><p>Низкая фиксированная комиссия — 200 ₽ с проведённого занятия стоимостью 1 200 ₽. Это 16,7%.</p></div><div><Check aria-hidden="true" /><h3>Ваше расписание</h3><p>Вы сообщаете, когда готовы проводить индивидуальные онлайн-занятия.</p></div></div>
        <section className="tutor-payout tutor-leads" aria-labelledby="tutor-leads-title">
          <span className="tutor-payout-label">Маркетинг и подбор</span>
          <h3 id="tutor-leads-title">Ищем вам клиентов</h3>
          <p>Мы занимаемся маркетингом, привлекаем учеников и помогаем им выбрать репетитора. TopRepet — сервис, который находит вам постоянных клиентов.</p>
        </section>
        <div className="tutor-payout" aria-label="С одного занятия 1 000 рублей получает преподаватель. Стоимость занятия 1 200 рублей, комиссия TopRepet 200 рублей."><span className="tutor-payout-label">С одного занятия</span><strong className="tutor-payout-main">1 000 ₽</strong><span className="tutor-payout-caption">получаете вы</span><div className="tutor-payout-bar"><span /></div><div className="tutor-payout-bottom"><span>Стоимость занятия <b>1 200 ₽</b></span><span>Комиссия TopRepet <b>200 ₽</b></span></div></div>
      </section>
      <section className="container for-tutors-section tutor-process" aria-labelledby="tutor-steps-title"><h2 id="tutor-steps-title">Как начать</h2><ol className="tutor-steps"><li><span>1</span><div><h3>Выберите направления</h3><p>Отметьте предметы и задачи, с которыми работаете.</p></div></li><li><span>2</span><div><h3>Напишите менеджеру</h3><p>Обсудим сотрудничество и подготовим вашу анкету.</p></div></li><li><span>3</span><div><h3>Проводите занятия</h3><p>Когда появляется подходящий запрос, знакомьтесь с учеником и начинайте работу.</p></div></li></ol></section>
      <Teachers title="Они уже с TopRepet" caption="Познакомьтесь с преподавателями по разным предметам." />
      <MessageBuilder />
      <section className="container for-tutors-section tutor-faq" aria-labelledby="tutor-faq-title">
        <h2 id="tutor-faq-title">Вопросы и ответы</h2>
        <Accordion className="faq-list">
          {tutorQuestions.map(({ question, answer }, index) => (
            <AccordionItem className="faq-item" key={question} value={String(index)}>
              <AccordionTrigger className="faq-trigger">{question}</AccordionTrigger>
              <AccordionContent className="faq-answer"><p>{answer}</p></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <script type="application/ld+json">{JSON.stringify(tutorFaqSchema).replace(/</g, '\\u003c')}</script>
    </article>
  );
}
