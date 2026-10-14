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

export function ProfileNew() {
  const { id } = useParams();
  const teacher = findTeacher(id);

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
    ['20 мин', 'знакомство'],
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
                <span className="gbtn glass trh-pf-heart" role="button" aria-label="В избранное"><Icon name="heart" /></span>
              </div>
              <div className="trh-pf-sheet">
                <div className="trh-sec" {...rv('up', 0.05)}>
                  <h1 id="teacher-name" className="trh-h1 trh-h1-xl">{teacher.name}</h1>
                  <p className="muted trh-pf-role">{teacher.role}</p>
                  <div className="fr fw" style={{ gap: 8 }}>
                    <span className="st st-wait"><Icon name="gift" />Знакомство 20 мин бесплатно</span>
                    <span className="st st-neutral"><Icon name="video" />Онлайн</span>
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
            <section className="trh-sec">
              <h2 className="h2 trh-h2" {...rv('up')}>Как проходят занятия</h2>
              <p className="cap trh-pf-text" {...rv('up', 0.05)}>{teacher.approach}</p>
            </section>

            <hr className="rule" />
            <section className="trh-sec">
              <h2 className="h2 trh-h2" {...rv('up')}>Цены</h2>
              <div {...rv('up', 0.05)}>
                <div className="rowline"><span><b>Знакомство</b><br /><span className="muted">20 минут, один раз, без оплаты</span></span><b className="ok" style={{ color: 'var(--ok)' }}>бесплатно</b></div>
                <div className="rowline"><span><b>Занятие</b><br /><span className="muted">60 минут</span></span><b className="tn">{rub(studentPrice)}</b></div>
              </div>
              <p className="muted md">Цену назначает репетитор. Сервисный сбор 10% уже включён в сумму.</p>
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
                <div className="rowline"><span className="muted">Знакомство</span><b>20 минут, бесплатно</b></div>
              </div>
              <div className="fr fb"><span>Цена за 60 минут</span><b className="tn" style={{ fontSize: 30, letterSpacing: '-0.04em' }}>{rub(studentPrice)}</b></div>
              <A to={LINKS.intro} className="btn btn-primary btn-lg btn-block">Записаться на знакомство</A>
              <A to={LINKS.help} className="btn btn-fill btn-block">Написать преподавателю</A>
              <p className="muted sm">Цена указана с учётом сервисного сбора 10%.</p>
            </div>
          </aside>
        </div>

        <div className="actionbar glass trh-pf-bar">
          <div className="meta"><b className="tn">{rub(studentPrice)}</b><span>за 60 минут</span></div>
          <A to={LINKS.intro} className="btn btn-primary" >Записаться</A>
        </div>
      </main>
    </TrShell>
  );
}
