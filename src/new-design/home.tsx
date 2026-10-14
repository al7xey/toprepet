import { Link } from 'react-router-dom';
import { teachers } from '../entities/teacher';
import { PRICE } from '../shared/config/site';
import { teacherPhotoAttributes } from '../shared/lib/teacher-photo';
import { Icon } from './icon';
import { LINKS } from './links';
import { A, TrShell } from './shell';

const FORMATS = [
  ['book', 'По предметам', '1–11 классы'],
  ['pen', 'Домашние задания', '1–11 классы'],
  ['checks', 'ОГЭ и ЕГЭ', '8–11 классы'],
  ['shapes', 'Начало учёбы', 'До школы'],
  ['globe', 'Языки', 'Взрослым'],
  ['target', 'Работа и карьера', 'Взрослым'],
  ['school', 'Высшее образование', 'Студентам'],
  ['heart', 'Хобби и творчество', 'Любой возраст'],
] as const;

const STEPS = [
  ['Поставьте цель', 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.'],
  ['Выберите репетитора', 'Сравните анкеты, цены и отзывы в каталоге или создайте заявку: репетиторы откликнутся сами.'],
  ['Познакомьтесь бесплатно', 'Выберите время в анкете и запишитесь на 20 минут: бесплатно и без оплаты.'],
  ['Занимайтесь по плану', 'Уроки онлайн в удобное время. Деньги списываются, когда репетитор подтвердит запись.'],
] as const;

const FAQ = [
  ['Как записаться на занятие?', 'Выберите репетитора, откройте анкету, выберите свободное время и подтвердите запись. Оплата заморозится на карте и спишется, когда репетитор подтвердит занятие.'],
  ['Как работает бесплатное знакомство?', 'Знакомство длится 20 минут, проходит онлайн и не требует оплаты. Оно доступно один раз для каждой пары ученик и репетитор.'],
  ['Сколько стоят занятия?', 'Каждый репетитор сам назначает цену. В анкете и каталоге вы видите итоговую сумму вместе с сервисным сбором 10%, доплачивать ничего не нужно.'],
  ['Что такое заявка?', 'Если не нашли подходящего репетитора, опишите задачу и бюджет. Репетиторы сами откликнутся с ценой и свободным временем, останется выбрать и записаться.'],
  ['Как отменить или перенести занятие?', 'Отмена бесплатна за 4 часа и раньше до начала. Позже деньги получает репетитор. Для переноса предложите другое окно в карточке урока.'],
  ['Что делать, если занятие не состоялось?', 'Нажмите «Сообщить о проблеме» в течение 24 часов после начала. Если занятие не было проведено, вернём 100% оплаты.'],
] as const;

/** Цена для ученика: цена репетитора плюс сервисный сбор 10%. */
const studentPrice = Math.round(PRICE * 1.1);
const priceLabel = `от ${new Intl.NumberFormat('ru-RU').format(studentPrice).replace(/\s/g, ' ')} ₽`;

function TutorCard({ id, name, subjects, photo }: { id: string; name: string; subjects: string; photo: string }) {
  return (
    <Link className="tc s" to={`/teachers/${id}/`} aria-label={`${name}, ${subjects}`} draggable={false}>
      <img src={photo} {...teacherPhotoAttributes(id, 'card')} alt="" loading="lazy" decoding="async" draggable={false} />
      <span className="pp glass-photo">{priceLabel}</span>
      <span className="heart glass" role="button" aria-label="В избранное"><Icon name="heart" /></span>
      <span className="pl">
        <b>{name}<span className="rt new">новый</span></b>
        <span>{subjects}</span>
      </span>
    </Link>
  );
}

export function HomeNew() {
  const first = teachers[0];
  return (
    <TrShell>
      <main id="main" tabIndex={-1} className="trh-main">
        <section className="trh-hero" aria-labelledby="hero-title">
          <div className="trh-hero-text">
            <h1 id="hero-title" className="hero-h trh-hero-h">Топ репет —<br /><span>топ результат</span></h1>
            <ul className="benefits">
              <li><span className="ic-sq"><Icon name="user" /></span><span>Индивидуальные<br />занятия</span></li>
              <li><span className="ic-sq"><Icon name="cal" /></span><span>Удобный<br />график</span></li>
              <li><span className="ic-sq"><Icon name="chart" /></span><span>Быстрый<br />результат</span></li>
            </ul>
            <div className="trh-hero-btns">
              <A to={LINKS.catalog} className="btn btn-primary btn-lg">Найти репетитора<Icon name="arrow" /></A>
              <A to={LINKS.request} className="btn btn-warm btn-lg">Создать заявку</A>
            </div>
          </div>
          <div className="trh-hero-media">
            <img src="/images/hero-slide-3-1200.webp" alt="Ученица занимается за ноутбуком" width={1200} height={900} fetchPriority="high" />
            <span className="glass float trh-badge trh-badge-a">
              <img className="avatar" src={first.photo} alt="" width={36} height={36} />
              <span style={{ lineHeight: 1.2 }}>{first.name}<br /><span className="rt" style={{ fontSize: 12 }}>{first.cardSubjects}</span></span>
            </span>
            <span className="glass float trh-badge trh-badge-b">
              <Icon name="gift" style={{ color: 'var(--accent)', width: 20, height: 20 }} />Знакомство 20 мин бесплатно
            </span>
          </div>
        </section>

        <section className="g20" aria-labelledby="formats-title">
          <div className="sec-h"><h2 id="formats-title" className="h2 trh-h2">Выберите занятия</h2></div>
          <div className="trh-formats">
            {FORMATS.map(([icon, title, sub]) => (
              <Link key={title} className="fmt2" to={LINKS.catalog}>
                <span className="ic-sq"><Icon name={icon} /></span>
                <span className="g4" style={{ minWidth: 0 }}><b>{title}</b><small>{sub}</small></span>
                <Icon name="arrow" style={{ marginLeft: 'auto', width: 18, height: 18, color: 'var(--accent)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </section>

        <section className="g20" aria-labelledby="teachers-title">
          <div className="sec-h">
            <h2 id="teachers-title" className="h2 trh-h2">Топ репеты</h2>
            <Link className="arrow-btn" to={LINKS.catalog} aria-label="Все репетиторы"><Icon name="arrow" /></Link>
          </div>
          <p className="cap">Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
          <div className="tcg trh-teachers">
            {teachers.slice(0, 6).map((teacher) => (
              <TutorCard key={teacher.id} id={teacher.id} name={teacher.name} subjects={teacher.cardSubjects} photo={teacher.photo} />
            ))}
          </div>
        </section>

        <section id="how" className="g32" aria-labelledby="how-title">
          <h2 id="how-title" className="h2 trh-h2">Как всё устроено</h2>
          <ol className="tl">
            {STEPS.map(([title, text], index) => (
              <li key={title}><i>{index + 1}</i><div><h3>{title}</h3><p>{text}</p></div></li>
            ))}
          </ol>
        </section>

        <section className="g20 trh-intro" aria-labelledby="intro-title">
          <h2 id="intro-title" className="h2 trh-h2">Познакомьтесь до первого занятия</h2>
          <p className="cap" style={{ fontSize: 18 }}>20 минут бесплатно, чтобы обсудить цель, познакомиться с репетитором и понять, как лучше выстроить занятия.</p>
          <ol className="g16">
            {([['target', 'Определим цель', 'Разберёмся, с чем нужна помощь.'], ['cal', 'Согласуем формат', 'Обсудим график и удобный темп.'], ['checks', 'Составим план', 'Определим, с чего начать занятия.']] as const).map(([icon, title, text]) => (
              <li key={title} className="fr" style={{ gap: 16 }}>
                <span className="ic-sq"><Icon name={icon} /></span>
                <div className="g4"><b style={{ fontSize: 18 }}>{title}</b><span className="muted">{text}</span></div>
              </li>
            ))}
          </ol>
          <div><A to={LINKS.intro} className="btn btn-primary btn-lg"><Icon name="gift" />Бесплатное знакомство<Icon name="arrow" /></A></div>
        </section>

        <section className="trh-trust" aria-labelledby="trust-title">
          <img src="/images/payment-trust.webp" alt="Человек спокойно читает книгу, облокотившись на большой замок" width={1536} height={1024} loading="lazy" />
          <div className="g16" style={{ minWidth: 0 }}>
            <h2 id="trust-title" className="h2 trh-h2 trh-h2-s">100% гарантия возврата средств</h2>
            <p className="cap" style={{ fontSize: 18 }}>100% возврат оплаты, если оплаченное занятие не было проведено.</p>
            <p className="cap">Деньги не переводятся репетитору сразу: их списывают, когда репетитор подтвердит запись, и выплачивают после проведённого занятия. В других спорных ситуациях поддержка поможет разобраться.</p>
            <div><A to={LINKS.refund} className="btn btn-line">Оплата и возвраты</A></div>
          </div>
        </section>

        <div className="panel trh-panel">
          <div className="g20 trh-panel-in">
            <h2 id="self-title" className="trh-panel-h">Записывайтесь сами</h2>
            <ul className="ticks">
              <li><Icon name="check" />Выбирайте время в расписании репетитора</li>
              <li><Icon name="check" />Цена указана в анкете, сервисный сбор уже включён</li>
              <li><Icon name="check" />Деньги заморожены и спишутся после подтверждения</li>
              <li><Icon name="check" />Бесплатная отмена за 4 часа до начала</li>
            </ul>
            <div><A to={LINKS.catalog} className="btn btn-primary btn-lg">Найти репетитора</A></div>
          </div>
        </div>

        <section className="fr fw fb" style={{ gap: 20 }} aria-labelledby="help-title">
          <div className="g10" style={{ maxWidth: 560 }}>
            <h2 id="help-title" className="h2 trh-h2 trh-h2-s">Нужна помощь?</h2>
            <p className="cap">Ответим на вопросы об оплате, переносах и возвратах в чате поддержки.</p>
          </div>
          <A to={LINKS.help} className="btn btn-line btn-lg"><Icon name="chat" />Помощь</A>
        </section>

        <div className="panel trh-panel">
          <div className="g20" style={{ justifyItems: 'start' }}>
            <h2 className="trh-panel-h trh-panel-h2" style={{ maxWidth: 600 }}>Вы репетитор? Найдём для вас учеников</h2>
            <A to={LINKS.tutors} className="btn btn-primary btn-lg">Стать топ-репетом</A>
          </div>
        </div>

        <section className="g24" aria-labelledby="faq-title">
          <h2 id="faq-title" className="h2 trh-h2 trh-h2-s">Вопросы и ответы</h2>
          <div className="faq">
            {FAQ.map(([question, answer]) => (
              <details key={question}><summary>{question}<Icon name="plus" /></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>
      </main>
    </TrShell>
  );
}
