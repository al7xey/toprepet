import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Confirm, Field, IBtn, Input, Note, Switch, TextField } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useSession, auth, students } from '../../api';
import { ZONES, utcLabel } from '../../lib/time';

export default function Settings() {
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const [name, setName] = useState(me.name);
  const [oldPw, setOldPw] = useState('');
  const [pw, setPw] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [removeChild, setRemoveChild] = useState('');
  const student = me.role === 'student';
  const zones = ZONES.some(z => z.id === me.tz) ? ZONES : [{ id: me.tz, city: me.tz }, ...ZONES];
  const profile = (
    <div className="card">
      <b className="h3">Профиль</b>
      <TextField label="Имя" value={name} onChange={setName} autoComplete="name" style={{ maxWidth: 'none' }} />
      <Field label="Почта" help="Почту сменить нельзя: она нужна для входа и чеков" style={{ maxWidth: 'none' }}><Input value={me.email} disabled /></Field>
      <Field label="Часовой пояс" htmlFor="tz" help="Всё время на сайте показываем в этом поясе" style={{ maxWidth: 'none' }}>
        <select id="tz" className="input" value={me.tz} onChange={e => run(() => auth.updateMe({ tz: e.target.value }), 'Часовой пояс сохранён')}>
          {zones.map(z => <option key={z.id} value={z.id}>{`${z.city} (${utcLabel(z.id)})`}</option>)}
        </select>
      </Field>
      <div><Btn v="primary" size="m" disabled={!name.trim() || name === me.name} onClick={() => run(() => auth.updateMe({ name: name.trim() }), 'Имя сохранено')}>Сохранить</Btn></div>
      {me.role === 'tutor' && <Note>Имя и фото в анкете меняются в мастере анкеты.</Note>}
    </div>
  );
  const notices = (
    <div className="card">
      <b className="h3">Уведомления на почту</b>
      <label className="between" style={{ gap: 12, cursor: 'pointer' }}><span><b style={{ display: 'block' }}>Непрочитанные сообщения</b><span className="small">Если сообщение не прочитано 15 минут</span></span><Switch checked={me.settings.emailUnread} onChange={v => run(() => auth.updateMe({ settings: { ...me.settings, emailUnread: v } }), v ? 'Письма о сообщениях включены' : 'Письма о сообщениях выключены')} label="Письма о непрочитанных сообщениях" /></label>
      <label className="between" style={{ gap: 12, cursor: 'pointer' }}><span><b style={{ display: 'block' }}>Напоминания об уроках</b><span className="small">За 24 часа и за 1 час до урока</span></span><Switch checked={me.settings.lessonReminders} onChange={v => run(() => auth.updateMe({ settings: { ...me.settings, lessonReminders: v } }), v ? 'Напоминания включены' : 'Напоминания выключены')} label="Напоминания об уроках" /></label>
      <span className="small">Подтверждения записей, переносы и решения по спорам приходят всегда.</span>
    </div>
  );
  const password = (
    <div className="card">
      <b className="h3">Пароль</b>
      {me.viaYandex && !me.passwordHash ? <Note>Вы входите через Яндекс ID. Пароль можно задать, чтобы входить и по почте.</Note> : <TextField label="Текущий пароль" type="password" value={oldPw} onChange={setOldPw} autoComplete="current-password" style={{ maxWidth: 'none' }} />}
      <TextField label="Новый пароль" type="password" value={pw} onChange={setPw} autoComplete="new-password" help="Не короче 8 символов" style={{ maxWidth: 'none' }} />
      <div><Btn size="m" disabled={pw.length < 8} onClick={() => { if (run(() => { auth.changePassword(oldPw, pw); return true; }, 'Пароль изменён')) { setOldPw(''); setPw(''); } }}>Сменить пароль</Btn></div>
    </div>
  );
  const children = student && (
    <div className="card">
      <b className="h3">Дети</b>
      <span className="small">Записывайте на уроки от своего имени — репетитор увидит, кто занимается.</span>
      {me.children.map(c => <div key={c.id} className="between"><span><b>{c.name}</b> <span className="small">{c.age}</span></span><IBtn icon="trash" label={`Удалить ${c.name}`} onClick={() => setRemoveChild(c.id)} /></div>)}
      <div className="cols half" style={{ gap: 8 }}>
        <TextField label="Имя" value={childName} onChange={setChildName} placeholder="Миша" />
        <TextField label="Возраст или класс" value={childAge} onChange={setChildAge} placeholder="14 лет, 8 класс" />
      </div>
      <div><Btn size="m" icon="plus" disabled={!childName.trim() || !childAge.trim()} onClick={() => { if (run(() => students.addChild(childName, childAge))) { setChildName(''); setChildAge(''); toast('Добавили', { tone: 'ok' }); } }}>Добавить</Btn></div>
    </div>
  );
  const exit = <Btn v="danger" block={phone} onClick={() => { auth.logout(); navigate('/'); }}>Выйти из аккаунта</Btn>;
  const modal = <Confirm open={!!removeChild} title="Удалить ребёнка из профиля?" text="Записанные уроки останутся, но выбрать его при новой записи будет нельзя." confirm="Удалить" danger onClose={() => setRemoveChild('')} onConfirm={() => { run(() => students.removeChild(removeChild), 'Удалено'); setRemoveChild(''); }} />;
  const side = me.role === 'tutor' ? 'Анкета' : me.role === 'admin' ? 'Споры' : '';
  if (phone)
    return (
      <Page title="Настройки" back={true}>
        {profile}{notices}{children}{password}{exit}{modal}
      </Page>
    );
  return (
    <Page title="Настройки" kind="cabinet" side={side}>
      <h1 className="h1">Настройки</h1>
      <div className="cols half" style={{ alignItems: 'start' }}>
        <div className="stack">{profile}{children}</div>
        <div className="stack">{notices}{password}<div>{exit}</div></div>
      </div>
      {modal}
    </Page>
  );
}
