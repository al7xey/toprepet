import { Link } from 'react-router-dom';
import { usePageMeta } from '../../ui/meta';

/* «Мои занятия». The list of bookings arrives with booking in iteration 3; until then the empty state of У4.3. */
export function Cabinet() {
  usePageMeta('Мои занятия', { noindex: true });
  return (
    <>
      <h1 className="h1">Мои занятия</h1>
      <div className="card f">
        <b className="h3">Пока нет занятий</b>
        <p className="mut">Выберите репетитора и&nbsp;свободное время&nbsp;— запись появится здесь.</p>
        <Link className="btn s p" to="/teachers/" style={{ justifySelf: 'start' }}>
          Найти репетитора
        </Link>
      </div>
    </>
  );
}
