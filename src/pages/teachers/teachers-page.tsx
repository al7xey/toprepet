import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Search } from 'lucide-react';

import { teachers } from '../../entities/teacher';
import { subjects } from '../../entities/lesson';
import { TeacherCard } from '../../widgets/teachers/teachers';

const availableSubjects = subjects.filter((subject) =>
  teachers.some((teacher) => teacher.helpTopics.includes(subject)),
);

function searchText(value: string) {
  return value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

export default function TeachersPage() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const filterRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) filterRef.current?.removeAttribute('open');
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && filterRef.current?.hasAttribute('open')) {
        filterRef.current.removeAttribute('open');
        filterRef.current.querySelector<HTMLElement>('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  const selectSubject = (value: string | null) => {
    setSelectedSubject(value);
    filterRef.current?.removeAttribute('open');
    filterRef.current?.querySelector<HTMLElement>('summary')?.focus();
  };
  const search = searchText(query);
  const results = teachers.filter((teacher) =>
    (!selectedSubject || teacher.helpTopics.includes(selectedSubject)) &&
    (!search || searchText([
      teacher.name,
      teacher.role,
      teacher.cardSubjects,
      ...teacher.helpTopics,
      teacher.intro,
    ].join(' ')).includes(search)),
  );

  const reset = () => {
    setInput('');
    setQuery('');
    setSelectedSubject(null);
  };

  const resultWord = results.length === 1 ? 'преподаватель' : results.length >= 2 && results.length <= 4 ? 'преподавателя' : 'преподавателей';

  return (
    <div className="teachers-page container">
      <header className="teachers-page-heading">
        <h1>Топ репеты</h1>
        <p>Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
      </header>

      <form className="teachers-search" onSubmit={(event) => { event.preventDefault(); setQuery(input.trim()); }}>
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          aria-label="Поиск по предмету, теме или имени преподавателя"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Предмет, тема или репет"
        />
        <button type="submit">Найти</button>
      </form>

      <div className="teachers-filter-row">
        <details className="teachers-subject-filter" data-active={Boolean(selectedSubject)} ref={filterRef}>
          <summary aria-label="Выбрать предмет">
            <BookOpen size={16} aria-hidden="true" />
            <span>Предметы</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="teachers-subject-options">
            <button type="button" className="teachers-subject-option" data-selected={!selectedSubject} aria-pressed={!selectedSubject} onClick={() => selectSubject(null)}>
              Все предметы{!selectedSubject && <Check size={16} aria-hidden="true" />}
            </button>
            {availableSubjects.map((item) => (
              <button type="button" key={item} className="teachers-subject-option" data-selected={selectedSubject === item} aria-pressed={selectedSubject === item} onClick={() => selectSubject(item)}>
                {item}{selectedSubject === item && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </details>
        {(query || selectedSubject) && (
          <button type="button" className="teachers-filter-reset" onClick={reset}>
            <span>Сбросить</span><span>фильтры</span>
          </button>
        )}
      </div>

      <section className="teachers-results" aria-label="Преподаватели">
        <div className="teachers-results-heading">
          <p aria-live="polite">Найдено: <strong>{results.length} {resultWord}</strong></p>
        </div>
        {results.length ? (
          <div className="teachers-directory-grid">
            {results.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                id={teacher.id}
                cardSubjects={teacher.cardSubjects}
                photo={teacher.photo}
                index={teachers.indexOf(teacher)}
              />
            ))}
          </div>
        ) : (
          <div className="teachers-empty">
            <h2>По вашему запросу преподавателей не нашлось</h2>
            <p>Попробуйте другое имя, предмет или тему.</p>
            <button type="button" className="button button-primary" onClick={reset}>Показать всех</button>
          </div>
        )}
      </section>
    </div>
  );
}
