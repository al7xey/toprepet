import { useState, type SubmitEvent } from 'react';
import { setNewPassword } from '../../api/auth';
import { updateProfile } from '../../api/profile';
import { useSession } from '../../api/session';
import { ZONES, guessZone, utcLabel, zoneCity } from '../../lib/time';
import { Field, SelectField } from '../../ui/Field';
import { usePageMeta } from '../../ui/meta';

/* /cabinet/settings/ and /tutor/settings/: name, time zone, password. The role is fixed at sign-up (У3.1), so there is no field for it. */
export function Settings() {
  usePageMeta('Настройки', { noindex: true });
  const { profile, refresh } = useSession();
  const [name, setName] = useState(profile?.name ?? '');
  const [tz, setTz] = useState(profile?.tz ?? guessZone());
  const [nameError, setNameError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const zones = ZONES.some(z => z.id === tz) ? ZONES : [{ id: tz, city: zoneCity(tz) }, ...ZONES];

  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    if (!name.trim()) {
      setNameError('Напишите, как к вам обращаться.');
      return;
    }
    setNameError(null);
    setBusy(true);
    try {
      await updateProfile(profile.id, { name, tz });
      await refresh();
      setStatus({ ok: true, text: 'Сохранили' });
    } catch {
      setStatus({ ok: false, text: 'Не получилось сохранить. Проверьте интернет и попробуйте ещё раз.' });
    }
    setBusy(false);
  }

  return (
    <>
      <h1 className="h1">Настройки</h1>
      <div className="stack l" style={{ maxWidth: 520 }}>
        <form id="profile-form" className="stack l" onSubmit={save} noValidate>
          <Field label="Имя" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} error={nameError} maxLength={80} />
          <Field label="Email" type="email" value={profile?.email ?? ''} readOnly hint={"На него приходят письма о\u00a0занятиях"} />
          <SelectField
            label="Часовой пояс"
            value={tz}
            onChange={e => setTz(e.target.value)}
            hint={tz === guessZone() ? 'Определили по\u00a0браузеру' : 'Все времена в\u00a0кабинете и\u00a0письмах показываем в\u00a0этом поясе'}
          >
            {zones.map(z => (
              <option key={z.id} value={z.id}>
                {z.city}, {utcLabel(z.id)}
              </option>
            ))}
          </SelectField>
        </form>
        <PasswordCard />
        {status ? <output className={status.ok ? 'toast' : 'alert'}>{status.text}</output> : null}
        <button type="submit" form="profile-form" className="btn p" disabled={busy}>
          Сохранить
        </button>
      </div>
    </>
  );
}

function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (password.length < 8) errs.password = 'Пароль короче 8 символов.';
    else if (repeat !== password) errs.repeat = 'Пароли не совпадают.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await setNewPassword(password);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setPassword('');
      setRepeat('');
      setResult({ ok: true, text: 'Пароль изменён' });
    } else {
      setResult({ ok: false, text: 'Не получилось изменить пароль. Попробуйте ещё раз.' });
    }
  }

  return (
    <section className="card f" aria-labelledby="pwd-title">
      <b id="pwd-title">Пароль</b>
      {result ? (
        <output className={result.ok ? 'toast' : 'alert'}>{result.text}</output>
      ) : null}
      {open ? (
        <form className="stack" onSubmit={submit} noValidate>
          <Field
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            hint="Не меньше 8 символов"
          />
          <Field label="Ещё раз" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} error={errors.repeat} />
          <div className="row">
            <button type="submit" className="btn s p" disabled={busy}>
              Сохранить пароль
            </button>
            <button type="button" className="btn s" onClick={() => setOpen(false)}>
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn s"
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
        >
          Изменить пароль
        </button>
      )}
    </section>
  );
}
