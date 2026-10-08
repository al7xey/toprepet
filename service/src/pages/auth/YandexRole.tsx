import { Navigate, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Note } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { auth } from '../../api';
import { useApp } from '../../ui/app-state';
import { Choice } from './Role';
import { takeReturn } from './shared';

/* First Yandex ID login: the account is not created silently, the person picks a role first. */
export default function YandexRole() {
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const p = auth.pendingYandex();
  if (!p) return <Navigate to="/login" replace />;
  const pick = (role: 'student' | 'tutor') => {
    const u = run(() => auth.yandexSignUp(role));
    if (!u) return;
    const ret = takeReturn();
    if (role === 'tutor') navigate('/tutor/profile/edit?step=1', { replace: true });
    else navigate(ret?.to && ret.to !== '/' && !ret.to.startsWith('/start') ? `/start/for-whom?then=${encodeURIComponent(ret.to)}` : '/start/for-whom', { replace: true });
  };
  return (
    <Page title="Регистрация" back="/login" mTitle="Регистрация">
      <div className="r1-onb" style={{ maxWidth: 760, paddingTop: phone ? 0 : 16 }}>
        <Alert tone="ok" icon="check" title="Яндекс ID подтверждён" style={{ maxWidth: 'none' }}>{`${p.name.split(' ')[0]}, ${p.email}`}</Alert>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className={phone ? 'h2' : 'h1'}>Как вы будете пользоваться TopRepet?</h1>
          <p className="sub">Выберите один вариант, и сразу перейдём к настройке.</p>
        </div>
        <div className={phone ? 'cols' : 'cols half'} style={{ gap: 12 }}>
          <Choice onClick={() => pick('student')} tone="teal" title="Хочу учиться" text="Найти репетитора или опубликовать заявку" big={!phone} />
          <Choice onClick={() => pick('tutor')} tone="orange" title="Хочу преподавать" text="Создать анкету и получать учеников" big={!phone} />
        </div>
        <Note icon="info" className="r1-plain">Роль потом не меняется. Для второй роли понадобится отдельный аккаунт с другой почтой.</Note>
      </div>
    </Page>
  );
}
