import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export function LearningStory() {
  return (
    <section className="learning-story container" aria-labelledby="learning-title">
      <div className="learning-art">
        <img src="/images/tutor-session.webp" srcSet="/images/tutor-session-small.webp 640w, /images/tutor-session.webp 1200w" sizes="(min-width: 800px) 46vw, 100vw" width="1200" height="800" alt="Иллюстрация: репетитор и ребёнок вместе разбирают задание" loading="lazy" decoding="async" />
        <span className="art-caption">Вопросы — часть учёбы</span>
      </div>
      <div className="learning-copy">
        <p className="section-kicker">Под вашу задачу</p>
        <h2 id="learning-title">Больше понимания.<br />Больше самостоятельности.</h2>
        <p>Сложная тема, домашнее задание или экзамен — начнём с того, что важно сейчас. Разберём материал на примерах, а затем предложим ребёнку решить задачу самостоятельно.</p>
        <ul className="learning-points">
          {['Один на один с репетитором', 'График, удобный вашей семье', 'Индивидуальный план занятий'].map((text) => <li key={text}><Check size={19} aria-hidden="true" />{text}</li>)}
        </ul>
        <Link className="inline-link" to="/" state={{ scrollTo: 'contact' }}>Обсудить занятия</Link>
      </div>
    </section>
  );
}
