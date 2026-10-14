import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTeacher } from '../entities/teacher';
import { teacherPhotoAttributes } from '../shared/lib/teacher-photo';
import { studentPrice } from './home';
import { Icon } from './icon';
import { LINKS } from './links';
import { rv } from './reveal';
import { A, TrShell } from './shell';

const rub = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value).replace(/\s/g, ' ')} ₽`;
const ACH_ICONS = ['target', 'school', 'book'] as const;
const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'];

type Day = { key: string; wd: string; n: number; label: string; month: string; off: boolean[] };

/** Ближайшие семь дней. Считается в браузере, поэтому в пререндере блок пустой. Расписание демонстрационное. */
function buildDays(): Day[] {
  const out: Day[] = [];
  const base = new Date();
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const wd = d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
    const month = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
    out.push({
      key: d.toISOString().slice(0, 10), wd, n: d.getDate(), month,
      label: `${wd[0].toUpperCase()}${wd.slice(1)} ${d.getDate()} ${month}`,
      off: TIMES.map((_, index) => (d.getDate() + index) % 4 === 0),
    });
  }
  return out;
}

export function ProfileNew() {
  const { id } = useParams();
  const teacher = findTeacher(id);
  const [days, setDays] = useState<Day[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const list = buildDays();
    setDays(list);
    setTime(TIMES.find((_, index) => !list[0].off[index]) ?? null);
  }, []);
  const day = days[dayIndex];
  const when = day && time ? `${day.label}, ${time}` : null;

  if (!teacher) {
    return (
      <TrShell current="catalog">
        <main id="main" tabIndex={-1} className="trh-main">
          <section className="trh-sec trh-notfound">
            <b className="trh-404">404</b>
            <h1 className="trh-h1">Анкета не найдена</h1>
            <p className="lead">Возможно, ссылка устарела или анкета снята с публикации.</p>
            <div className="fr fw" style={{ gap: 10 }}>
              <A to={LINKS.catalog} className="btn btn-primary btn-lg">К преподавателям</A>
              <A to={LINKS.home} className="btn btn-line btn-lg">На главную</A>
            </div>
          </section>
        </main>
      </TrShell>
    );
  }

  const stats: [string, string][] = [
    [rub(studentPrice), 'за 60 мин'],
    ['Бесплатно', 'знакомство'],
    ['Онлайн', 'формат'],
    [teacher.experience, 'опыт'],
  ];

  return (
    <TrShell current="catalog" bareMobile tight>
      <main id="main" tabIndex={-1} className="trh-main">
        <Link className="trh-back" to={LINKS.catalog}><Icon name="back" />Все преподаватели</Link>

        <div className="trh-pf">
          <div className="trh-pf-main">
            <section className="trh-pf-top">
              <div className="trh-pf-photo" {...rv('scale')}>
                <img src={teacher.photo} {...teacherPhotoAttributes(teacher.id, 'profile')} alt={`Фото: ${teacher.name}`} fetchPriority="high" decoding="async" />
                <Link className="gbtn glass trh-pf-back" to={LINKS.catalog} aria-label="Назад"><Icon name="back" /></Link>
              </div>
              <div className="trh-pf-sheet">
                <div className="trh-sec" {...rv('up', 0.05)}>
                  <h1 id="teacher-name" className="trh-h1 trh-h1-xl">{teacher.name}</h1>
                  <p className="muted trh-pf-role">{teacher.role}</p>
                  <div className="fr fw" style={{ gap: 8 }}>
                    <span className="st st-neutral"><Icon name="gift" />Бесплатное знакомство</span>
                  </div>
                </div>
                <div className="stats" {...rv('up', 0.1)}>
                  {stats.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}
                </div>
                <p className="trh-pf-intro" {...rv('up', 0.15)}>{teacher.intro}</p>
              </div>
            </section>

            <hr className="rule" />
            <section className="trh-sec" aria-labelledby="teacher-achievements">
              <h2 id="teacher-achievements" className="h2 trh-h2" {...rv('up')}>Образование и достижения</h2>
              <ul className="ach">
                {teacher.achievements.map((item, index) => (
                  <li key={item.title} {...rv('up', index * 0.08)}>
                    <span className="ic-sq"><Icon name={ACH_ICONS[index % ACH_ICONS.length]} /></span>
                    <div><b>{item.title}</b><span className="d">{item.text}</span></div>
                  </li>
                ))}
              </ul>
            </section>

            <hr className="rule" />
            <div className="trh-pf-two">
              <section className="trh-sec">
                <h2 className="h2 trh-h2" {...rv('up')}>Опыт</h2>
                <div className="fr fw" {...rv('up', 0.05, { gap: 10 })}><span className="tag">{teacher.experience}</span></div>
              </section>
              <section className="trh-sec">
                <h2 className="h2 trh-h2" {...rv('up')}>С чем поможет</h2>
                <div className="fr fw" {...rv('up', 0.05, { gap: 10 })}>
                  {teacher.helpTopics.map((topic) => <span key={topic} className="tag">{topic}</span>)}
                </div>
              </section>
            </div>

            <hr className="rule" />
            <section className="trh-sec" aria-labelledby="slots-title">
              <div className="fr fb" {...rv('up')}>
                <h2 id="slots-title" className="h2 trh-h2">Свободное время</h2>
                <span className="muted md">{day ? `${day.month} ${new Date().getFullYear()}` : '\u00a0'}</span>
              </div>
              <div className="dates trh-dates" {...rv('up', 0.05)}>
                {days.map((item, index) => (
                  <button type="button" key={item.key} className={`date${index === dayIndex ? ' sel' : ''}`} aria-pressed={index === dayIndex}
                    onClick={() => { setDayIndex(index); setTime(TIMES.find((_, i) => !item.off[i]) ?? null); }}>
                    <small>{item.wd}</small><b>{item.n}</b>
                  </button>
                ))}
              </div>
              <div className="slots trh-slots" {...rv('up', 0.1)}>
                {day && TIMES.map((t, index) => (
                  <button type="button" key={t} className={`slot${t === time ? ' sel' : ''}${day.off[index] ? ' off' : ''}`} disabled={day.off[index]} aria-pressed={t === time} onClick={() => setTime(t)}>{t}</button>
                ))}
              </div>
              <span className="muted sm trh-tz"><Icon name="globe" />Время московское. Расписание пока демонстрационное.</span>
            </section>

            <hr className="rule" />
            <section className="trh-sec">
              <h2 className="h2 trh-h2" {...rv('up')}>Как проходят занятия</h2>
              <p className="cap trh-pf-text" {...rv('up', 0.05)}>{teacher.approach}</p>
            </section>

            <hr className="rule" />
            <section className="trh-sec">
              <h2 className="h2 trh-h2" {...rv('up')}>Цены</h2>
              <div {...rv('up', 0.05)}>
                <div className="rowline"><span><b>Знакомство</b><br /><span className="muted">один раз, длительность выбирает репетитор</span></span><b className="ok" style={{ color: 'var(--ok)' }}>бесплатно</b></div>
                <div className="rowline"><span><b>Занятие</b><br /><span className="muted">60 минут</span></span><b className="tn">{rub(studentPrice)}</b></div>
              </div>
            </section>

            <hr className="rule" />
            <section className="trh-sec">
              <h2 className="h2 trh-h2" {...rv('up')}>Отзывы</h2>
              <div className="empty" {...rv('scale')}>
                <Icon name="chat" />
                <b>Отзывов пока нет</b>
                <span>Они появятся после первых оплаченных занятий.</span>
              </div>
            </section>
          </div>

          <aside className="trh-pf-aside" aria-label="Запись">
            <div className="card sum" {...rv('right', 0.1)}>
              <h2 style={{ fontSize: 22, letterSpacing: '-0.02em' }}>Запись</h2>
              <div className="trh-sum-rows">
                <div className="rowline"><span className="muted">Репетитор</span><b>{teacher.name}</b></div>
                <div className="rowline"><span className="muted">Занятие</span><b>60 минут</b></div>
                <div className="rowline"><span className="muted">Когда</span><b>{when ?? 'Выберите время'}</b></div>
              </div>
              <div className="fr fb"><span>Цена за 60 минут</span><b className="tn" style={{ fontSize: 30, letterSpacing: '-0.04em' }}>{rub(studentPrice)}</b></div>
              <A to="/screens/confirm" className="btn btn-primary btn-lg btn-block">Записаться</A>
              <A to="/screens/introc" className="btn btn-soft btn-block">Бесплатное знакомство</A>
              <A to="/screens/firstmsg" className="btn btn-fill btn-block">Написать преподавателю</A>
            </div>
          </aside>
        </div>

        <div className="actionbar glass trh-pf-bar">
          <div className="meta"><b className="tn">{when ?? 'Выберите время'}</b><span>60 минут · {rub(studentPrice)}</span></div>
          <A to="/screens/confirm" className="btn btn-primary">Записаться</A>
        </div>
      </main>
    </TrShell>
  );
}
