import { useEffect, useRef, useState } from 'react';
import { subjects } from '../entities/lesson';
import { teachers } from '../entities/teacher';
import { safeChoice, trackGoal } from '../shared/lib/analytics';
import { Icon } from './icon';
import { LINKS } from './links';
import { TutorCard } from './home';
import { rv } from './reveal';
import { A, TrShell } from './shell';

const availableSubjects = subjects.filter((subject) => teachers.some((teacher) => teacher.helpTopics.includes(subject)));
const PAGE = 8;

const norm = (value: string) => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');

function matches(teacher: (typeof teachers)[number], subject: string | null, term: string) {
  return (!subject || teacher.helpTopics.includes(subject)) &&
    (!term || norm([teacher.name, teacher.role, teacher.cardSubjects, ...teacher.helpTopics, teacher.intro].join(' ')).includes(term));
}

export function CatalogNew() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const drop = useRef<HTMLDetailsElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!drop.current?.contains(event.target as Node)) drop.current?.removeAttribute('open');
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') drop.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setShown((n) => n + PAGE);
    }, { rootMargin: '600px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, subject, query]);

  const term = norm(query);
  const results = teachers.filter((teacher) => matches(teacher, subject, term));
  const word = results.length === 1 ? 'преподаватель' : results.length >= 2 && results.length <= 4 ? 'преподавателя' : 'преподавателей';
  const reset = () => { setInput(''); setQuery(''); setSubject(null); setShown(PAGE); };
  const pick = (value: string | null) => {
    setSubject(value);
    setShown(PAGE);
    trackGoal('teacher_filter', { subject: value ? safeChoice(value) : 'all' });
    drop.current?.removeAttribute('open');
  };

  return (
    <TrShell current="catalog" tight>
      <main id="main" tabIndex={-1} className="trh-main">
        <header className="trh-sec" {...rv('up')}>
          <h1 className="trh-h1">Топ репеты</h1>
          <p className="lead">Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
        </header>

        <div className="trh-sec trh-tools" {...rv('up', 0.05)}>
          <form
            className="search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(input.trim());
              setShown(PAGE);
              const t = norm(input);
              trackGoal('teacher_search', { has_query: Boolean(t), results: teachers.filter((x) => matches(x, subject, t)).length });
            }}
          >
            <Icon name="search" style={{ color: 'var(--muted)' }} />
            <input
              className="ym-disable-keys trh-search-input"
              type="search"
              aria-label="Поиск по предмету, теме или имени преподавателя"
              placeholder="Предмет, тема или репет"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-s">Найти</button>
          </form>

          <div className="trh-chips">
            <details className="trh-drop" ref={drop}>
              <summary className={`chipf${subject ? ' on' : ''}`} aria-label="Выбрать предмет">
                <Icon name="book" />{subject ?? 'Предмет'}<Icon name="down" />
              </summary>
              <div className="trh-drop-menu glass-thick">
                <button type="button" className={!subject ? 'on' : undefined} aria-pressed={!subject} onClick={() => pick(null)}>
                  Все предметы{!subject && <Icon name="check" />}
                </button>
                {availableSubjects.map((item) => (
                  <button type="button" key={item} className={subject === item ? 'on' : undefined} aria-pressed={subject === item} onClick={() => pick(item)}>
                    {item}{subject === item && <Icon name="check" />}
                  </button>
                ))}
              </div>
            </details>
            <span className="chipf trh-soon" title="Скоро">Цена<Icon name="down" /></span>
            <span className="chipf trh-soon" title="Скоро">Когда<Icon name="down" /></span>
            <span className="chipf trh-soon" title="Скоро"><Icon name="gift" />Есть знакомство</span>
            {(query || subject) && <button type="button" className="chipf gray" onClick={reset}>Сбросить</button>}
          </div>
        </div>

        <section className="trh-sec" aria-label="Преподаватели">
          <div className="fr fb" {...rv('up', 0.1)}>
            <p className="muted" aria-live="polite">Найдено: <b style={{ color: 'var(--ink)' }}>{results.length}{' '}{word}</b></p>
            <span className="chipf gray trh-soon"><Icon name="sort" /><span className="trh-sort-t">Рекомендуемые</span></span>
          </div>
          {results.length ? (
            <div className="tcg trh-grid">
              {results.slice(0, shown).map((teacher, index) => (
                <TutorCard key={teacher.id} id={teacher.id} name={teacher.name} subjects={teacher.cardSubjects} photo={teacher.photo} delay={(index % 4) * 0.07} />
              ))}
            </div>
          ) : (
            <div className="empty" {...rv('scale')}>
              <Icon name="search" />
              <b>По вашему запросу преподавателей не нашлось</b>
              <span>Попробуйте другое имя, предмет или тему.</span>
              <div className="fr fw" style={{ justifyContent: 'center', marginTop: 10, gap: 10 }}>
                <button type="button" className="btn btn-primary" onClick={reset}>Показать всех</button>
                <A to={LINKS.request} className="btn btn-line">Создать заявку</A>
              </div>
            </div>
          )}
          {results.length > shown && <div ref={sentinel} className="trh-sentinel" aria-hidden="true" />}
        </section>
      </main>
    </TrShell>
  );
}
