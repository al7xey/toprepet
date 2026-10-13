import { Link } from 'react-router-dom';
import { useSession } from '../../api/session';
import { ROLE_HOME } from '../../api/types';
import { usePageMeta } from '../../ui/meta';

/* О1. A static host answers 200 for SPA routes; the real 404 status comes with prerendering on one domain (iteration 5). */
export function NotFound() {
  usePageMeta('Страница не найдена', { noindex: true });
  const { profile } = useSession();
  return (
    <div className="center stack l" style={{ textAlign: 'center', justifyItems: 'center', paddingTop: 40 }}>
      <span className="big" style={{ fontSize: 64 }} aria-hidden="true">
        404
      </span>
      <h1 className="h1">Такой страницы нет</h1>
      <p className="sub">Возможно, ссылка устарела. Анкеты и&nbsp;занятия по-прежнему на&nbsp;месте.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn p" to="/teachers/">
          К&nbsp;репетиторам
        </Link>
        {profile ? (
          <Link className="btn" to={ROLE_HOME[profile.role]}>
            В&nbsp;кабинет
          </Link>
        ) : (
          <Link className="btn" to="/">
            На&nbsp;главную
          </Link>
        )}
      </div>
    </div>
  );
}
