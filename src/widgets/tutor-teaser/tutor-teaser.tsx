import { Link } from 'react-router-dom';

export function TutorTeaser() {
  return (
    <section className="tutor-teaser container" aria-labelledby="tutor-teaser-title">
      <div>
        <h2 id="tutor-teaser-title">Вы репетитор? Найдём для вас учеников</h2>
      </div>
      <Link className="button button-primary" to="/for-repetitor/">Стать топ-репетом</Link>
    </section>
  );
}
