import { Link } from 'react-router-dom';
import { usePageMeta } from '../../ui/meta';

/* Temporary home of the service; the landing blocks move here in iteration 5. */
export function Home() {
  usePageMeta('TopRepet');
  return (
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
          <Link className="btn" to="/signup/?role=tutor">
            Для репетиторов
          </Link>
        </div>
      </div>
    </section>
  );
}
