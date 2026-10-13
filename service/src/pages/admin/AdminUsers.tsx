import { useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyUserAction, listJournal, listUsers, type UserAction, type UserRow } from '../../api/admin';
import { useSession } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { journalText } from '../../lib/admin';
import { fmtDayTime, MSK } from '../../lib/time';
import { TextAreaField } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';

const ROLE_NAME = { student: 'ученик', tutor: 'репетитор', admin: 'администратор' } as const;
const ROLES = [
  { id: '', label: 'Все роли' },
  { id: 'student', label: 'Ученики' },
  { id: 'tutor', label: 'Репетиторы' },
  { id: 'admin', label: 'Администраторы' },
];

const PROFILE_PILL = {
  published: { text: 'Опубликована', cls: 'ok' },
  draft: { text: 'Черновик', cls: '' },
  hidden: { text: 'Скрыта', cls: 'bad' },
} as const;

const ACTION_LABEL: Record<UserAction, string> = {
  hide_tutor: 'Скрыть анкету из каталога',
  unhide_tutor: 'Вернуть анкету',
  block_user: 'Заблокировать аккаунт',
  unblock_user: 'Разблокировать аккаунт',
};

const DONE: Record<UserAction, string> = {
  hide_tutor: 'Анкета скрыта из каталога',
  unhide_tutor: 'Анкета возвращена',
  block_user: 'Аккаунт заблокирован',
  unblock_user: 'Аккаунт разблокирован',
};

/** What can be done to a user now: hide or return a tutor's profile, block or unblock the account (not one's own). */
function actionsFor(u: UserRow, me: string): UserAction[] {
  const list: UserAction[] = [];
  if (u.role === 'tutor' && u.tutorStatus) list.push(u.tutorStatus === 'hidden' ? 'unhide_tutor' : 'hide_tutor');
  if (u.id !== me) list.push(u.blockedAt ? 'unblock_user' : 'block_user');
  return list;
}

/** /admin/users (mockups adminUsers, adminBlock, А1): search by name or email, actions with a required reason, the journal. */
export function AdminUsers() {
  usePageMeta('Пользователи', { noindex: true });
  const { profile } = useSession();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const role = ROLES.some(r => r.id === params.get('role')) ? (params.get('role') ?? '') : '';
  const [text, setText] = useState(q);
  const [tick, setTick] = useState(0);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const users = useAsync(() => listUsers(q, role), `${q}#${role}#${tick}`);
  const journal = useAsync(() => listJournal(20), `j#${tick}`);

  function set(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  function search(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    set('q', text.trim());
  }

  return (
    <>
      <h1 className="h1">Пользователи</h1>
      <form className="filt" aria-label="Поиск пользователей" onSubmit={search}>
        <label className="sr-only" htmlFor="adm-uq">
          Имя или email
        </label>
        <input id="adm-uq" className="inp" type="search" placeholder="Имя или email" value={text} onChange={e => setText(e.target.value)} />
        <label className="sr-only" htmlFor="adm-role">
          Роль
        </label>
        <select id="adm-role" className="inp" value={role} onChange={e => set('role', e.target.value)}>
          {ROLES.map(r => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn s">
          Найти
        </button>
      </form>
      {toast ? <output className="toast">{toast}</output> : null}
      {users.loading ? (
        <Loading />
      ) : users.error || !users.data ? (
        <LoadError title="Не получилось загрузить пользователей" onRetry={users.reload} />
      ) : users.data.rows.length ? (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Имя</th>
                <th scope="col">Роль</th>
                <th scope="col">Email</th>
                <th scope="col">Анкета</th>
                <th scope="col">Отмен за 30 дней</th>
                <th scope="col">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.data.rows.map(u => {
                const pill = u.role === 'tutor' && u.tutorStatus ? PROFILE_PILL[u.tutorStatus] : null;
                const can = actionsFor(u, profile?.id ?? '');
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {u.blockedAt ? (
                        <>
                          {' '}
                          <span className="pill bad" title={u.blockedReason ?? undefined}>
                            Заблокирован
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>{ROLE_NAME[u.role]}</td>
                    <td>{u.email}</td>
                    <td>{pill ? <span className={`pill ${pill.cls}`} title={u.hiddenReason ?? undefined}>{pill.text}</span> : null}</td>
                    <td className="num">{u.cancels30d}</td>
                    <td>
                      {can.length ? (
                        <button type="button" className="btn s" aria-haspopup="dialog" aria-label={`Действия: ${u.name}`} onClick={() => setTarget(u)}>
                          Действия
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.data.total > users.data.rows.length ? (
            <p className="mut sm">
              Показаны первые {users.data.rows.length} из&nbsp;{users.data.total}. Уточните поиск.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="card f">
          <b className="h3">Никого не нашлось</b>
          <p className="mut">Проверьте имя или email.</p>
        </div>
      )}
      <section className="stack s" aria-label="Журнал">
        <b className="h2">Журнал</b>
        {journal.data?.length ? (
          <ol className="tl">
            {journal.data.map(j => (
              <li key={j.id} className="d">
                {fmtDayTime(j.at, MSK)} · {journalText(j.action, j.adminName, j.target, j.reason)}
              </li>
            ))}
          </ol>
        ) : journal.loading ? (
          <Loading />
        ) : journal.error ? (
          <p className="mut">Не получилось загрузить журнал.</p>
        ) : (
          <p className="mut">Действий пока не было.</p>
        )}
      </section>
      <Overlay open={target !== null} onClose={() => setTarget(null)} className="dlg" label={target?.name ?? 'Действия'}>
        {target ? (
          <ActionForm
            u={target}
            actions={actionsFor(target, profile?.id ?? '')}
            onCancel={() => setTarget(null)}
            onDone={action => {
              setTarget(null);
              setToast(`${DONE[action]}. Запись в журнале.`);
              setTick(t => t + 1);
            }}
          />
        ) : null}
      </Overlay>
    </>
  );
}

function ActionForm({ u, actions, onCancel, onDone }: { u: UserRow; actions: UserAction[]; onCancel: () => void; onDone: (a: UserAction) => void }) {
  const [action, setAction] = useState<UserAction>(actions[0]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Напишите причину: она попадёт в журнал.');
      return;
    }
    setBusy(true);
    const res = await applyUserAction(action, u.id, reason);
    setBusy(false);
    if (res.ok) onDone(action);
    else setError(res.reason === 'reason_required' ? 'Напишите причину: она попадёт в журнал.' : 'Не получилось. Обновите страницу и попробуйте ещё раз.');
  }

  return (
    <form className="stack" onSubmit={e => void submit(e)} noValidate>
      <h2 className="h2">{u.name}</h2>
      {u.blockedAt && u.blockedReason ? <p className="mut sm">Заблокирован: «{u.blockedReason}»</p> : null}
      {u.tutorStatus === 'hidden' && u.hiddenReason ? <p className="mut sm">Анкета скрыта: «{u.hiddenReason}»</p> : null}
      <fieldset className="stack s">
        <legend className="sr-only">Действие</legend>
        <div className="opts col">
          {actions.map(a => (
            <label key={a} className="opt">
              <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} />
              {ACTION_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <TextAreaField
        label="Причина"
        value={reason}
        maxLength={300}
        onChange={e => {
          setReason(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <p className="hint">Действие попадёт в&nbsp;журнал. Будущие занятия не&nbsp;отменяются автоматически.</p>
      <button type="submit" className="btn p w" disabled={busy}>
        Применить
      </button>
      <button type="button" className="btn w" onClick={onCancel}>
        Отмена
      </button>
    </form>
  );
}
