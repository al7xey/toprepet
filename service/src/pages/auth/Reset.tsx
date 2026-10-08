import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Btn, Note, TextField } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { auth, ApiError } from '../../api';
import { useCountdown } from '../../ui/hooks';
import { now } from '../../lib/time';

export default function Reset() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);
  const resend = useCountdown((sentAt ?? 0) + 60_000);

  const send = () => {
    setError('');
    try {
      auth.requestReset(email);
      setSentAt(now());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не получилось отправить');
    }
  };

  const body = sentAt ? (
    <>
      <div className="r1-sent"><Icon name="inbox" /></div>
      <div style={{ display: 'grid', gap: 8 }}>
        <h1 className="h2">Проверьте почту</h1>
        <p className="sub">Отправили ссылку на <b style={{ color: 'var(--ink)' }}>{email}</b>, если такой аккаунт есть. Она действует 1&nbsp;час.</p>
      </div>
      <Note icon="info">Письма нет? Проверьте папку «Спам» или отправьте ещё раз через минуту.</Note>
      <div className="r1-form">
        <Btn v="primary" block to="/login">Ко входу</Btn>
        <Btn block disabled={resend.left > 0} onClick={send}>{resend.left > 0 ? `Отправить ещё раз · ${resend.label}` : 'Отправить ещё раз'}</Btn>
        <Btn block size="s" v="white" to="/mail" icon="mail">Открыть демо-почту</Btn>
      </div>
    </>
  ) : (
    <>
      <div style={{ display: 'grid', gap: 8 }}>
        <h1 className="h2">Восстановление пароля</h1>
        <p className="sub">Пришлём на почту ссылку, чтобы задать новый пароль.</p>
      </div>
      <form className="r1-form" onSubmit={e => { e.preventDefault(); send(); }} noValidate>
        <TextField label="Почта" type="email" value={email} onChange={setEmail} autoComplete="email" error={error} autoFocus />
        <Btn v="primary" block type="submit">Отправить ссылку</Btn>
      </form>
    </>
  );
  return (
    <Page title="Восстановление пароля" back="/login" mTitle="Пароль">
      <div className="r1-auth" style={{ marginTop: 16 }}>
        {!sentAt && <Btn size="s" icon="left" to="/login" className="hide-phone" style={{ justifySelf: 'start' }}>Ко входу</Btn>}
        {body}
      </div>
    </Page>
  );
}
