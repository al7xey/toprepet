import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, TextField } from '../../ui/kit';
import { auth, ApiError } from '../../api';
import { useApp } from '../../ui/app-state';
import { homeFor } from './shared';

export default function NewPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useApp();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== repeat) return setError('Пароли не совпадают');
    try {
      auth.resetPassword(sp.get('token') ?? '', password);
      toast('Пароль изменён, вы вошли', { tone: 'ok' });
      const u = auth.currentUser();
      navigate(u ? homeFor(u) : '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не получилось');
    }
  };
  return (
    <Page title="Новый пароль" back="/login" mTitle="Пароль">
      <form className="r1-auth" style={{ marginTop: 16 }} onSubmit={submit} noValidate>
        <h1 className="h2">Задайте новый пароль</h1>
        <TextField label="Новый пароль" type="password" value={password} onChange={setPassword} placeholder="Не меньше 8 символов" autoComplete="new-password" />
        <TextField label="Повторите пароль" type="password" value={repeat} onChange={setRepeat} autoComplete="new-password" error={error} />
        <Btn v="primary" block type="submit">Сохранить и войти</Btn>
        <Btn block size="s" to="/password/reset">Запросить новую ссылку</Btn>
      </form>
    </Page>
  );
}
