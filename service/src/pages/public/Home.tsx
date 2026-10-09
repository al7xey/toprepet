import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Icon, type IconName } from '../../ui/icons';
import { TeacherGrid } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, catalog, sel } from '../../api';
import { SearchBar } from './SearchBar';
import { nb } from '../../lib/text';

const BENEFITS: [IconName, string, string][] = [
  ['user', 'Индивидуальные', 'занятия'],
  ['cal', 'Удобный', 'график'],
  ['spark', 'Быстрый', 'результат'],
];

const STEPS = [
  ['Поставьте цель', 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.'],
  ['Выберите репетитора', 'Выберите преподавателя, который подходит вам по предмету, цели и формату занятий.'],
  ['Познакомьтесь бесплатно', 'Бесплатные 20 минут на знакомство с репетитором, обсуждение целей, графика и формата занятий.'],
  ['Занимайтесь по плану', 'Репетитор объяснит сложные темы, разберёт задания и поможет закрепить материал.'],
];

const INTRO: [IconName, string, string][] = [
  ['spark', 'Определим цель', 'Разберёмся, с чем нужна помощь.'],
  ['cal', 'Согласуем формат', 'Обсудим график и удобный темп.'],
  ['check', 'Составим план', 'Определим, с чего начать занятия.'],
];

const FAQ = [
  ['Как начать занятия?', 'Подберите репетитора в каталоге или создайте заявку, выберите свободное окно и запишитесь. Первое знакомство с репетитором бесплатное.'],
  ['Как оплачивать и переносить занятия?', 'При записи сумма замораживается на карте, а списывается, когда репетитор подтвердит урок. Бесплатно отменить или перенести можно за 4 часа до начала.'],
  ['Есть бесплатное знакомство?', 'Да, 15–30 минут, чтобы обсудить цель и формат. Одно знакомство с каждым репетитором, без оплаты.'],
  ['Можно выбрать конкретного преподавателя?', 'Да. Откройте анкету, посмотрите цены, отзывы и свободное время, и записывайтесь сразу на удобное окно.'],
  ['Что если занятие прошло плохо?', 'В течение 24 часов нажмите «Сообщить о проблеме»: деньги заморозим, поддержка разберётся и вернёт оплату, если проблема подтвердится.'],
];

const DIR_ICON: Record<string, IconName> = { school: 'doc', homework: 'edit', exam: 'check', start: 'spark', languages: 'globe', career: 'user', university: 'inbox', hobby: 'heart' };

export default function Home() {
  const d = useDb();
  const me = useSession();
  const phone = usePhone();
  const { askLogin } = useApp();
  const track = useRef<HTMLDivElement>(null);
  /* tutors with real photos first: placeholders of demo accounts go last */
  const top = sel.searchTutors(d, sel.EMPTY_FILTERS).sort((a, b) => Number(!a.tutor.photo || a.tutor.photo.startsWith('data:')) - Number(!b.tutor.photo || b.tutor.photo.startsWith('data:')));
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: 'smooth' });
  const createRequest = () => (me ? undefined : askLogin('Войдите, чтобы создать заявку', { type: 'go', to: '/requests/new' }));

  return (
    <Page title="" phoneTop wide className="mh-page">
      <div className="mh">
        <section className="mh-hero" aria-labelledby="mh-title">
          <div className="mh-hero-copy">
            <h1 id="mh-title">Топ репет —<br /><span>топ результат</span></h1>
            <ul className="mh-benefits">
              {BENEFITS.map(([icon, a, b]) => <li key={a}><i><Icon name={icon} /></i><span>{a}<br />{b}</span></li>)}
            </ul>
            <SearchBar btn="primary" />
            <div className="mh-offer">
              <Link className="mh-btn mh-btn--primary" to="/teachers">Подобрать репетитора <Icon name="right" /></Link>
              <a className="mh-btn mh-btn--light" href="#how">Как всё устроено <Icon name="right" /></a>
            </div>
          </div>
          <div className="mh-art" aria-hidden="true"><img src="/images/hero-slide-1-1200.webp" srcSet="/images/hero-slide-1-640.webp 640w, /images/hero-slide-1-1200.webp 1200w" sizes="(min-width: 900px) 560px, 100vw" alt="" decoding="async" fetchPriority="high" /></div>
        </section>

        <section className="mh-sec" aria-labelledby="mh-dirs">
          <div className="mh-sec-h">
            <h2 id="mh-dirs">Выберите занятия</h2>
            <span className="mh-arrows"><button type="button" aria-label="Назад" onClick={() => scroll(-1)}><Icon name="left" /></button><button type="button" aria-label="Вперёд" onClick={() => scroll(1)}><Icon name="right" /></button></span>
          </div>
          <div className="mh-dirs" ref={track}>
            {catalog.DIRECTIONS.map(dir => (
              <article className="mh-dir" key={dir.id}>
                <div className="mh-dir-top"><i><Icon name={DIR_ICON[dir.id] ?? 'doc'} /></i><span>{dir.ages}</span></div>
                <h3>{dir.title}</h3>
                <p>{dir.text}</p>
                <Link className="mh-btn mh-btn--primary mh-btn--s" to={`/teachers?dir=${dir.id}`}>Выбрать</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mh-sec" id="how" aria-labelledby="mh-how">
          <h2 id="mh-how">Как всё устроено</h2>
          <ol className="mh-steps">
            {STEPS.map(([b, s], i) => <li key={b}><i>{i + 1}</i><div><h3>{b}</h3><p>{nb(s)}</p></div></li>)}
          </ol>
        </section>

        <section className="mh-sec" aria-labelledby="mh-top">
          <div className="mh-sec-h">
            <h2 id="mh-top">Топ репеты</h2>
            <Link className="mh-round" to="/teachers" aria-label="Все репетиторы"><Icon name="right" /></Link>
          </div>
          <p className="mh-cap">Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
          <TeacherGrid items={top.slice(0, phone ? 4 : 8)} />
          <div className="mh-more"><Link className="mh-btn mh-btn--light" to="/teachers">Все репетиторы <Icon name="right" /></Link></div>
        </section>

        <section className="mh-sec mh-intro" aria-labelledby="mh-intro">
          <div>
            <h2 id="mh-intro">Познакомьтесь до первого занятия</h2>
            <p className="mh-cap">20 минут бесплатно, чтобы обсудить цель, познакомиться с репетитором и понять, как лучше выстроить занятия.</p>
          </div>
          <ul>
            {INTRO.map(([icon, b, s]) => <li key={b}><i><Icon name={icon} /></i><div><b>{b}</b><span>{s}</span></div></li>)}
          </ul>
          <Link className="mh-btn mh-btn--primary" to="/teachers?intro=1"><Icon name="gift" /> Бесплатное знакомство <Icon name="right" /></Link>
        </section>

        <section className="mh-sec mh-trust" aria-labelledby="mh-trust">
          <img src="/images/payment-trust.webp" alt="" loading="lazy" decoding="async" />
          <div>
            <h2 id="mh-trust">100% гарантия возврата средств</h2>
            <p className="mh-cap">100% возврат оплаты, если оплаченное занятие не было проведено.</p>
            <p className="mh-cap">{nb('TopRepet выступает посредником между вами и репетитором: деньги не перечисляются преподавателю сразу, а выплачиваются только после проведённого занятия. Отменили за 4 часа и раньше — вернём всё. В других спорных ситуациях поддержка поможет разобраться и при наличии оснований оформить возврат.')}</p>
          </div>
        </section>

        <section className="mh-sec mh-requests" aria-labelledby="mh-rq">
          <div>
            <h2 id="mh-rq">Не нашли подходящего?</h2>
            <p className="mh-cap">Опишите задачу и бюджет — подходящие репетиторы сами предложат цену и время.</p>
          </div>
          <div className="mh-offer">
            {me ? <Link className="mh-btn mh-btn--primary" to="/requests/new">Создать заявку</Link> : <button type="button" className="mh-btn mh-btn--primary" onClick={createRequest}>Создать заявку</button>}
          </div>
        </section>

        <section className="mh-sec mh-teaser" aria-labelledby="mh-tutor">
          <h2 id="mh-tutor">Вы репетитор?<br />Найдём для вас учеников</h2>
          <p className="mh-cap">Анкета за 15 минут, своя цена и выплаты за каждый урок.</p>
          <Link className="mh-btn mh-btn--primary" to="/signup/tutor">Стать топ-репетом</Link>
        </section>

        <section className="mh-sec" aria-labelledby="mh-faq">
          <h2 id="mh-faq">Вопросы и ответы</h2>
          <div className="mh-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary><span>{q}</span><Icon name="plus" /></summary><p>{nb(a)}</p></details>
            ))}
          </div>
          <div className="mh-more"><Link className="mh-btn mh-btn--light" to="/help">Все вопросы</Link></div>
        </section>

        <footer className="mh-footer">
          <Link className="nv-logo" to="/"><Icon name="logo" />toprepet</Link>
          <span>Сервис частных репетиторов<br />© 2026 TopRepet</span>
          <nav aria-label="Ссылки">
            <Link to="/signup/tutor">Для репетиторов</Link>
            <Link to="/requests">Заявки учеников</Link>
            <Link to="/support">Написать в поддержку</Link>
            <Link to="/help">Помощь</Link>
            <a href="https://toprepet.ru/legal">Документы</a>
          </nav>
        </footer>
      </div>
    </Page>
  );
}
