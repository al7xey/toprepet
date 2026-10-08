import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Alert, Btn } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutors as tApi, tutorById } from '../../api';
import type { TutorProfile } from '../../api/types';
import { Chance, PrevCard, ReqList } from './shared';

const FIX: Record<string, string> = { photo: '/tutor/profile/edit?step=1', name: '/tutor/profile/edit?step=1', price: '/tutor/profile/edit?step=3', window: '/tutor/profile/edit?step=4' };

export default function Publish() {
  const d = useDb();
  const me = useSession()!;
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  return <Inner t={t} />;
}

export function SlugField({ t }: { t: TutorProfile }) {
  const { run, toast } = useApp();
  const [slug, setSlug] = useState(t.slug);
  const check = slug === t.slug ? { ok: true, message: 'Это ваш адрес. Сменить можно в любой момент.' } : tApi.checkSlug(slug);
  const save = () => {
    if (slug === t.slug) return;
    if (!check.ok) return;
    if (run(() => tApi.setSlug(slug))) toast('Адрес анкеты сохранён', { tone: 'ok' });
  };
  return (
    <div className="field r2-wide">
      <label htmlFor="slug">Адрес анкеты</label>
      <div className="r2-url" style={check.ok ? undefined : { boxShadow: '0 0 0 2px var(--red)' }}>
        <span>toprepet.ru/teachers/</span>
        <input id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} style={{ flex: 1, minWidth: 0, border: 0, background: 'none', font: 'inherit', fontWeight: 750, outline: 'none', padding: 0 }} aria-describedby="slug-check" />
      </div>
      <span id="slug-check" className={check.ok ? 'r2-good' : 'err'}><Icon name={check.ok ? 'check' : 'warn'} />{check.message}</span>
    </div>
  );
}

function Inner({ t }: { t: TutorProfile }) {
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const missing = tApi.requirements(t).filter(r => !r.done);
  const ready = !missing.length;
  const doPublish = () => {
    if (!run(() => tApi.publish())) return;
    const url = `toprepet.ru/teachers/${t.slug}`;
    toast(`Анкета опубликована: ${url}`, { tone: 'ok', action: { label: 'Скопировать', onClick: () => void navigator.clipboard?.writeText(`https://${url}`) } });
    navigate('/tutor/profile');
  };
  const chances = (
    <div className="card r2-chance">
      <b className="h3">Повысит шансы</b>
      {tApi.chances(t).map(c => <Chance key={c.id} label={c.label} done={c.done} action={<Btn size="s" to={c.to}>Добавить</Btn>} />)}
    </div>
  );
  const reqs = (
    <div className="card">
      <b className="h3">Для публикации нужно</b>
      <ReqList t={t} />
      {!ready && <div className="row-s">{missing.map(m => <Btn key={m.id} size="s" v="tinted" to={FIX[m.id]}>{`Добавить: ${m.label.toLowerCase()}`}</Btn>)}</div>}
    </div>
  );
  const title = t.published ? 'Анкета опубликована' : ready ? 'Почти готово' : 'Осталось немного';
  const sub = t.published ? 'Изменения видны в каталоге сразу.' : ready ? 'Все обязательные поля заполнены. Анкета появится в каталоге сразу, без модерации.' : 'Заполните обязательные пункты, и анкету можно публиковать. Без модерации — сразу в каталоге.';
  const publishBtn = t.published ? <Btn v="primary" size="m" to="/tutor/profile">Готово</Btn> : <Btn v="primary" size="m" disabled={!ready} onClick={doPublish}>Опубликовать анкету</Btn>;
  if (phone)
    return (
      <Page title="Публикация" back="/tutor/profile/edit?step=4" bottom={<ActionBar>{publishBtn}</ActionBar>}>
        <h1 className="h1">{title}</h1>
        <p className="sub">{phone && !t.published && ready ? 'Без модерации — сразу в каталоге.' : sub}</p>
        {reqs}{chances}
        <SlugField t={t} />
        <Btn size="m" block icon="eye" to="/tutor/profile/preview">Посмотреть как ученик</Btn>
      </Page>
    );
  return (
    <Page title="Публикация">
      <div style={{ maxWidth: 1080, width: '100%', justifySelf: 'center', display: 'grid', gap: 24 }}>
        <div className="title-block"><h1 className="h1">{title}</h1><p className="sub">{sub}</p></div>
        {!ready && <Alert tone="action" icon="info" title="Анкета пока не видна ученикам" style={{ maxWidth: 'none' }}>{`Не хватает: ${missing.map(m => m.label.toLowerCase()).join(', ')}.`}</Alert>}
        <div className="cols c2">
          <div className="stack">
            {reqs}{chances}
            <div className="card"><SlugField t={t} /></div>
            <div className="r2-actions" style={{ justifyContent: 'flex-start' }}>{publishBtn}<Btn size="m" icon="eye" to="/tutor/profile/preview">Посмотреть как ученик</Btn>{!t.published && <Btn size="m" to="/tutor/profile/edit?step=4">Назад к анкете</Btn>}</div>
          </div>
          <PrevCard t={t} />
        </div>
      </div>
    </Page>
  );
}
