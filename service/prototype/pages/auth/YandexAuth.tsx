import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Note, TextField } from '../../ui/kit';
import { auth, ApiError } from '../../api';
import { useApp } from '../../ui/app-state';
import { takeReturn, useAfterLogin, rememberReturn } from './shared';

/* Yandex ID. With VITE_YANDEX_CLIENT_ID set, the real OAuth flow is used; otherwise a demo consent screen
   stands in for Yandex and passes the name and e-mail the person enters. */
export default function YandexAuth() {
  const navigate = useNavigate();
  const afterLogin = useAfterLogin();
  const { toast } = useApp();
  const [name, setName] = useState('Ольга');
  const [email, setEmail] = useState('olga@yandex.ru');
  const [busy, setBusy] = useState(false);
  const real = !!auth.YANDEX_CLIENT_ID;

  const finish = (p: auth.YandexProfile) => {
    const ret = takeReturn();
    try {
      const r = auth.yandexSignIn(p);
      if ('needsRole' in r) {
        if (ret) rememberReturn(ret.to, ret.after);
        navigate('/signup/yandex', { replace: true });
      } else afterLogin(r.user, ret?.to, ret?.after);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Не получилось войти через Яндекс ID', { tone: 'bad' });
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    if (!real) return;
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('access_token');
    if (!token) {
      location.href = auth.yandexAuthorizeUrl('toprepet');
      return;
    }
    setBusy(true);
    auth.fetchYandexProfile(token).then(finish).catch(() => {
      toast('Яндекс ID не ответил, попробуйте ещё раз', { tone: 'bad' });
      navigate('/login', { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (real) return <Page title="Яндекс ID"><div className="loading-page"><span className="spinner spinner-dark" /></div></Page>;

  return (
    <Page title="Вход через Яндекс ID" back="/login" mTitle="Яндекс ID">
      <div className="r1-auth" style={{ marginTop: 16 }}>
        <div className="row-s"><span className="r1-ya-i" style={{ width: 40, height: 40, borderRadius: '50%', background: '#fc3f1d', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>Я</span><h1 className="h2">Яндекс ID</h1></div>
        <p className="sub">TopRepet запрашивает имя и почту. Пароль от Яндекса сервис не видит.</p>
        <Note icon="info">Демо-режим: ключ Яндекс ID не настроен (VITE_YANDEX_CLIENT_ID), поэтому данные из Яндекса заменены этой формой.</Note>
        <TextField label="Имя в Яндексе" value={name} onChange={setName} />
        <TextField label="Почта в Яндексе" type="email" value={email} onChange={setEmail} />
        <Btn v="primary" block loading={busy} onClick={() => finish({ name, email })}>Разрешить доступ</Btn>
        <Btn block onClick={() => navigate(-1)}>Отмена</Btn>
      </div>
    </Page>
  );
}
