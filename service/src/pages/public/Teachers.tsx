import { Link } from 'react-router-dom';
import { SUPPORT_URL } from '../../api/config';
import { usePageMeta } from '../../ui/meta';

/* Placeholder until the catalog (iteration 3). Open to guests: no login is asked here (У2.1-вход). */
export function Teachers() {
  usePageMeta('Репетиторы');
  return (
    <div className="stack l">
      <h1 className="h1">Репетиторы</h1>
      <div className="card f">
        <b className="h3">Каталог скоро появится здесь</b>
        <p className="mut">Анкеты со&nbsp;свободным временем и&nbsp;записью без переписки. Пока можно написать нам, и&nbsp;мы подберём репетитора.</p>
        <div className="row">
          <a className="btn s" href={SUPPORT_URL} target="_blank" rel="noreferrer">
            Написать нам
          </a>
          <Link className="btn s" to="/">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
