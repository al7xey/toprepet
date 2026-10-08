import { Link } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Ph } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { TeacherGrid } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, catalog, sel, reviews as rv } from '../../api';
import { SearchBar } from './SearchBar';
import { nb } from '../../lib/text';

const STEPS = [
  ['Поставьте цель', 'Опишите, что хотите изучать'],
  ['Выберите репетитора', 'Сравните анкеты, цены и отзывы'],
  ['Познакомьтесь бесплатно', '20 минут, без оплаты'],
  ['Занимайтесь по плану', 'Уроки онлайн в удобное время'],
];

export default function Home() {
  const d = useDb();
  const me = useSession();
  const phone = usePhone();
  const { askLogin } = useApp();
  const top = sel.searchTutors(d, sel.EMPTY_FILTERS);
  const hero = top.find(t => t.tutor.photo) ?? top[0];
  const heroRating = hero ? rv.tutorRating(d, hero.tutor.userId) : null;
  const createRequest = () => (me ? undefined : askLogin('Войдите, чтобы создать заявку', { type: 'go', to: '/requests/new' }));

  const heroPhoto = hero && (
    <Link to={`/teachers/${hero.tutor.slug}`} className="r3-photo" style={phone ? { aspectRatio: '5 / 4' } : undefined} aria-label={hero.tutor.name}>
      <Ph tone={hero.tutor.tone} src={hero.tutor.photo} />
      <div className="r3-plate glass">
        <b>{sel.cardSubjects(hero.tutor)}</b>
        <span>{hero.tutor.name.split(' ')[0]}{heroRating?.count ? <> <Icon name="star" /> {rv.fmtRating(heroRating.avg)} · {heroRating.count}&nbsp;отзывов</> : ''}</span>
      </div>
    </Link>
  );

  return (
    <Page title="" phoneTop wide>
      <section style={phone ? { display: 'grid', gap: 18 } : { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40, alignItems: 'center', paddingTop: 16 }}>
        <div className="r3-hero" style={{ gap: phone ? 18 : 22 }}>
          <h1>Топ репет —{phone ? ' ' : <br />}топ результат</h1>
          <div className="r3-perks"><span><Icon name="check" />Индивидуальные занятия</span><span><Icon name="check" />Удобный график</span><span><Icon name="check" />Быстрый результат</span></div>
          <div style={{ maxWidth: 560 }}><SearchBar btn="tinted" /></div>
          <div className={phone ? 'stack-s' : 'row'} style={{ gap: 10 }}>
            <Btn v="primary" block={phone} to="/teachers">Подобрать репетитора</Btn>
            {me ? <Btn block={phone} to="/requests/new">Создать заявку</Btn> : <Btn block={phone} onClick={createRequest}>Создать заявку</Btn>}
          </div>
        </div>
        {heroPhoto}
      </section>

      <section className="r3-sec">
        <h2 className="h2">Выберите занятия</h2>
        <div className="dirs" role="list">
          {catalog.DIRECTIONS.map(dir => (
            <Link key={dir.id} className="dir" to={`/teachers?dir=${dir.id}`} role="listitem">
              <Ph tone={dir.tone} />
              <span className="tx"><small>{dir.ages}</small><b>{dir.title}</b><span>{dir.text}</span></span>
              <Icon name="right" />
            </Link>
          ))}
        </div>
      </section>

      <section className="r3-sec">
        <div className="r3-sec-h"><h2 className="h2">Топ репеты</h2><Btn circle size="m" icon="right" to="/teachers" aria-label="Все репетиторы" /></div>
        <p className="sub" style={{ marginTop: -6 }}>Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
        <TeacherGrid items={top.slice(0, phone ? 4 : 8)} />
      </section>

      <section className="r3-sec">
        <h2 className="h2">Как всё устроено</h2>
        <div className="r3-steps">{STEPS.map(([b, s], i) => <div className="r3-step" key={b}><i>{i + 1}</i><b>{b}</b><span>{nb(s)}</span></div>)}</div>
      </section>

      <div className={phone ? 'r3-cards' : 'cols half'}>
        <div className="card r3-info"><span className="r3-ic"><Icon name="gift" /></span><div><h3 className="h3">Познакомьтесь до первого занятия</h3><span className="small">Определим цель · Согласуем формат · Составим план</span><Btn v="tinted" to="/teachers?intro=1">Бесплатное знакомство</Btn></div></div>
        <div className="card r3-info"><span className="r3-ic"><Icon name="shield" /></span><div><h3 className="h3">Гарантия возврата средств</h3><span className="small">{nb('Оплата замораживается при записи и списывается, когда репетитор подтвердит урок. Отменили за 4 часа и раньше, вернём всё. Не подтвердил, заморозка снимется.')}</span></div></div>
      </div>
      <div className={`card r3-info ${phone ? '' : 'r3-info--wide'}`}>
        <span className="r3-ic"><Icon name="user" /></span>
        <div><h3 className="h3">Вы репетитор? Найдём для вас учеников</h3><span className="small">Анкета за 15 минут, своя цена, выплаты за каждый урок.</span>{phone && <Btn to="/signup/tutor">Стать топ-репетом</Btn>}</div>
        {!phone && <Btn to="/signup/tutor">Стать топ-репетом</Btn>}
      </div>
      <footer className="small" style={{ display: 'grid', gap: 6, paddingTop: 8 }}>
        <span>TopRepet · индивидуальные онлайн-занятия с репетиторами</span>
        <span><Link className="link" to="/help">Вопросы и ответы</Link> · <Link className="link" to="/requests">Заявки учеников</Link> · <a className="link" href="https://toprepet.ru/legal">Документы</a></span>
      </footer>
    </Page>
  );
}
