import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { subjects } from '../../entities/lesson';
import { tutorExperienceOptions } from '../../shared/config/tutor-experience';
import { MessengerLinks } from '../../shared/ui/messenger-links';
import { Teachers } from '../../widgets/teachers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';

const directions = ['Школьная программа', 'Домашние задания', 'ОГЭ', 'ЕГЭ', 'Начальные классы', 'Подготовка к школе'];
/* Р-6, teksty.md §1 and §9: the tutor sets prices, the student pays the tutor directly, no commission. */
const tutorQuestions = [
  {
    question: 'Что делает TopRepet, а что — репетитор?',
    answer: 'TopRepet показывает вашу анкету ученикам и принимает записи в ваше свободное время. Занятие проводите вы: объясняете материал, разбираете задания и подбираете подход к цели ученика.',
  },
  {
    question: 'Как появляются ученики?',
    answer: 'Ученик находит вашу анкету в каталоге, выбирает свободное время и записывается. Вы подтверждаете или отклоняете запись в кабинете. Количество записей заранее не обещаем: оно зависит от спроса, предмета и свободного времени.',
  },
  {
    question: 'Сколько стоит занятие и какая комиссия?',
    answer: 'Цену за 60 и 90 минут вы назначаете сами. TopRepet не берёт комиссию и не проводит платежи: ученик платит вам напрямую после того, как вы подтвердили запись.',
  },
  {
    question: 'Как учитывать доход?',
    answer: 'Налоги со своих доходов репетитор платит сам. Если вы применяете НПД, доход учитывается и чеки формируются по правилам этого режима.',
  },
  {
    question: 'Как быстро нужно ответить на запись?',
    answer: 'В течение 24 часов, но не позже чем за 2 часа до начала. Если не ответить, запись отменится сама.',
  },
  {
    question: 'Кто определяет расписание?',
    answer: 'Вы сами: отмечаете в кабинете свободное время, и ученики записываются только в него. Занятие длится 60 или 90 минут.',
  },
  {
    question: 'Кто составляет план занятий?',
    answer: 'Репетитор предлагает индивидуальный план с учётом цели и уровня ученика. На занятиях можно разбирать школьную программу, домашние задания или готовиться к ОГЭ и ЕГЭ.',
  },
  {
    question: 'Можно ли преподавать несколько предметов?',
    answer: 'Да. Укажите в анкете предметы и темы, по которым действительно готовы проводить занятия.',
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
      <p>Анкету можно создать самостоятельно: <a href="/signup/?role=tutor">зарегистрироваться как репетитор</a>. Остались вопросы? Ответьте на несколько вопросов — мы подготовим сообщение менеджеру.</p>
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
          {tutorExperienceOptions.map(option => (
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
      <header className="container tutor-page-heading"><div className="tutor-hero-copy"><h1>Работай репетитором онлайн с <span>TopRepet</span></h1><a className="button button-primary tutor-hero-cta" href="/signup/?role=tutor">Стать топ репетитором <ArrowRight size={20} aria-hidden="true" /></a></div><img className="tutor-hero-image" src="/images/for-repetitor-hero-1200.webp" srcSet="/images/for-repetitor-hero-640.webp 640w, /images/for-repetitor-hero-1200.webp 1200w" sizes="(min-width: 760px) min(560px, calc((100vw - 104px) / 2)), calc(100vw - 28px)" alt="Команда преподавателей TopRepet" width="1200" height="900" loading="eager" fetchPriority="high" decoding="async" /></header>
      <section className="container for-tutors-section tutor-value" aria-labelledby="tutor-value-title">
        <div className="tutor-value-intro"><h2 id="tutor-value-title">Вы преподаёте. Мы помогаем найти учеников.</h2><p>TopRepet — сервис для репетиторов и учеников. Мы привлекаем запросы на занятия и помогаем подобрать преподавателя под цель ученика.</p></div>
        <div className="tutor-value-list"><div><Check aria-hidden="true" /><h3>Новые ученики</h3><p>Вашу анкету увидят ученики, которым подходит ваш предмет и формат занятий.</p></div><div><Check aria-hidden="true" /><h3>Свои цены</h3><p>Вы сами назначаете цену за 60 и 90 минут. Ученик платит вам напрямую, без комиссии.</p></div><div><Check aria-hidden="true" /><h3>Ваше расписание</h3><p>Отмечаете свободное время, и ученики записываются только в него.</p></div></div>
        <section className="tutor-payout tutor-leads" aria-labelledby="tutor-leads-title">
          <span className="tutor-payout-label">Маркетинг и подбор</span>
          <h3 id="tutor-leads-title">Ищем вам клиентов</h3>
          <p>Мы занимаемся маркетингом и приводим учеников в каталог. Анкета публикуется сразу, записи приходят в кабинет и на почту.</p>
        </section>
      </section>
      <section className="container for-tutors-section tutor-process" aria-labelledby="tutor-steps-title"><h2 id="tutor-steps-title">Как начать</h2><ol className="tutor-steps"><li><span>1</span><div><h3>Заполните анкету</h3><p>Предметы, образование, подход к занятиям и фото.</p></div></li><li><span>2</span><div><h3>Укажите цены и время</h3><p>Цена за 60 и 90 минут и свободные окна в расписании.</p></div></li><li><span>3</span><div><h3>Принимайте записи</h3><p>Подтвердите запись, пришлите ссылку на звонок и проведите занятие.</p></div></li></ol></section>
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
