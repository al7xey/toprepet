import { Link, useSearchParams } from 'react-router-dom';
import { usePageMeta } from '../../ui/meta';
import { safeNext } from '../../app/Guard';
import { LoginForm } from './LoginForm';

export function Login() {
  usePageMeta('Вход', { noindex: true });
  const [params] = useSearchParams();
  return (
    <div className="center stack">
      <h1 className="h1">Вход</h1>
      <p className="sub">Для учеников и&nbsp;репетиторов</p>
      <LoginForm next={safeNext(params.get('next'))} />
      <p className="mut sm">
        Вы репетитор?{' '}
        <Link className="lnk" to="/tutor/">
          Войти в&nbsp;кабинет репетитора
        </Link>{' '}
        работает по&nbsp;той же форме.
      </p>
    </div>
  );
}
