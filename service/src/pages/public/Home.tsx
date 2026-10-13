import { Link } from 'react-router-dom';
import { fetchCatalog } from '../../api/catalog';
import { useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { EMPTY } from '../../lib/catalog';
import { usePageMeta } from '../../ui/meta';
import { Grid } from './Teachers';

/* Directions as on toprepet.ru; each opens the catalog with the matching filter. */
const DIRECTIONS = [
  { title: 'Школьные предметы', text: 'Разберём тему и закрепим её на практике.', to: '/teachers/?goal=school' },
  { title: 'Домашние задания', text: 'Разберём каждое задание и объясним решение по шагам.', to: '/teachers/?goal=homework' },
  { title: 'ОГЭ и ЕГЭ', text: 'Разберём задания и требования экзаменационного формата.', to: '/teachers/?goal=ege' },
  { title: 'Подготовка к школе', text: 'Поможем освоить навыки, необходимые перед первым классом.', to: '/teachers/?goal=preschool' },
  { title: 'Начальные классы', text: 'Разберём школьную программу и укрепим знания по основным предметам.', to: '/teachers/?subject=primary' },
];

const STEPS = [
  ['Поставьте цель', 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.'],
  ['Выберите репетитора и время', 'В анкете видны цена и свободные окна. Запишитесь в удобное время прямо там, без переписки.'],
  ['Занимайтесь онлайн', 'Репетитор подтвердит запись и пришлёт ссылку на звонок перед занятием.'],
];

/* teksty.md, section 2 */
const FAQ = [
  ['Как записаться к репетитору?', 'Откройте анкету, выберите предмет, длительность и свободное время и нажмите «Записаться». Войти или создать аккаунт можно на этом же шаге, выбранное время сохранится.'],
  ['Сколько стоит занятие?', 'Цену назначает репетитор, она указана в анкете за 60 и 90 минут. Других платежей нет.'],
  ['Как оплатить занятие?', 'Напрямую репетитору после того, как он подтвердит запись. Как удобно оплатить, он напишет сам.'],
  ['Когда репетитор ответит?', 'В течение 24 часов, но не позже чем за 2 часа до начала. Если не ответит, запись отменится сама, и мы предложим другое время.'],
  ['Можно ли отменить занятие?', 'Да, в карточке занятия. Раньше чем за 4 часа до начала отмена ни к чему не обязывает. Позже репетитор вправе считать занятие состоявшимся.'],
  ['Как проходит занятие?', 'Онлайн по видеосвязи. Ссылку репетитор присылает перед каждым занятием, она появится в карточке занятия и придёт письмом.'],
  ['Что делать, если занятие не состоялось?', 'В течение 24 часов после окончания нажмите «Сообщить о проблеме» в карточке занятия. Поддержка разберётся за 3 рабочих дня.'],
  ['Можно заниматься только по домашним заданиям?', 'Да. Выберите направление «Домашние задания» и предмет, а в записи укажите, что нужно разобрать.'],
];

/** Mockup `home`: the landing blocks that matter for booking. The rest of the landing moves here in iteration 5. */
export function Home() {
  usePageMeta('Репетиторы онлайн: запись по любому предмету | TopRepet');
  const tz = useViewerZone();
  const top = useAsync(() => fetchCatalog(EMPTY, tz), `home|${tz}`);
  const items = (top.data ?? []).slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="stack l">
          <h1 className="h1 hero1">
            Индивидуальные занятия, <span>топ результат</span>
          </h1>
          <div className="facts3">
            <span className="chip">Удобный график</span>
            <span className="chip">Быстрый результат</span>
            <span className="chip">Все предметы</span>
          </div>
          <div className="row">
            <Link className="btn p" to="/teachers/">
              Подобрать репетитора
            </Link>
            <a className="btn" href="#how">
              Как всё устроено
            </a>
          </div>
        </div>
        <div className="ph">
          <img src="/images/hero-slide-3-1200.webp" srcSet="/images/hero-slide-3-640.webp 640w, /images/hero-slide-3-1200.webp 1200w" sizes="(min-width: 1000px) 480px, 100vw" alt="" />
        </div>
      </section>

      <section className="stack" aria-labelledby="dirs-ttl">
        <h2 className="h2" id="dirs-ttl">
          Выберите занятия
        </h2>
        <ul className="dirs">
          {DIRECTIONS.map(d => (
            <li key={d.title}>
              <Link className="dir" to={d.to}>
                <span className="ico" aria-hidden="true" />
                <b>{d.title}</b>
                <span className="mut sm">{d.text}</span>
                <span className="btn s" aria-hidden="true">
                  Выбрать
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {items.length ? (
        <section className="stack" aria-labelledby="top-ttl">
          <div className="row sb">
            <div className="stack s">
              <h2 className="h2" id="top-ttl">
                Топ репеты
              </h2>
              <p className="sub">Найдите преподавателя, с&nbsp;которым будет комфортно учиться.</p>
            </div>
          </div>
          <Grid items={items} />
          <Link className="btn s" to="/teachers/" style={{ justifySelf: 'center' }}>
            Смотреть всех преподавателей
          </Link>
        </section>
      ) : null}

      <section className="stack" id="how" aria-labelledby="how-ttl">
        <h2 className="h2" id="how-ttl">
          Как всё устроено
        </h2>
        <ol className="steps">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="step">
              <span className="ico num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="stack s">
                <b>{title}</b>
                <span className="mut">{text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack" aria-labelledby="faq-ttl">
        <h2 className="h2" id="faq-ttl">
          Вопросы
        </h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p className="mut">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
