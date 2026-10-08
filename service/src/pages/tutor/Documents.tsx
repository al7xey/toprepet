import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, IBtn, Note, St, TextField, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutors as tApi, tutorById } from '../../api';
import type { TutorDoc } from '../../api/types';
import { fmtFileSize, nb } from '../../lib/text';
import { NB, fmtDateShort } from '../../lib/time';

export default function Documents() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const { run, toast } = useApp();
  const [over, setOver] = useState(false);
  const [title, setTitle] = useState('');
  const [replace, setReplace] = useState<TutorDoc | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  const upload = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const ok = run(() => { tApi.uploadDoc({ name: f.name, size: f.size }, title.trim() || replace?.title || ''); return true; });
    if (!ok) return;
    if (replace) run(() => tApi.removeDoc(replace.id));
    setReplace(null);
    setTitle('');
    toast('Документ загружен. Проверим за 1–2 рабочих дня', { tone: 'ok' });
  };
  const pick = (doc?: TutorDoc) => { setReplace(doc ?? null); input.current?.click(); };
  const drop = (
    <div className={cx('r2-drop', over && 'is-over')} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}>
      <Icon name="plus" />
      <b className="h3">Диплом или сертификат</b>
      <p>{phone ? 'Фото или PDF до 20 МБ' : 'Перетащите сюда фото или PDF, или выберите файл'}</p>
      <TextField label="Что подтверждает документ" optional="необязательно" value={title} onChange={setTitle} placeholder="Например, IELTS 8.5" style={{ maxWidth: 320, justifySelf: 'center', textAlign: 'left' }} />
      <Btn v="primary" size="m" onClick={() => pick()}>Выбрать файл</Btn>
      <input ref={input} className="file-input" type="file" accept=".pdf,image/*" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
    </div>
  );
  const list = t.docs.length ? (
    <div className="r2-files">
      {[...t.docs].sort((a, b) => b.uploadedAt - a.uploadedAt).map(doc => (
        <div className="r2-file" key={doc.id}>
          <span className="ic"><Icon name={/\.(jpe?g|png|webp|heic)$/i.test(doc.name) ? 'image' : 'doc'} /></span>
          <span><b>{doc.name}</b><span className="small">{nb(`${doc.title ? `${doc.title} · ` : ''}загружен ${fmtDateShort(doc.uploadedAt, me.tz)} · ${fmtFileSize(doc.size)}`)}</span></span>
          {doc.status === 'ok' ? <St tone="ok" icon="check">Проверено</St> : doc.status === 'rejected' ? <St tone="bad" icon="x">Отклонено</St> : <St icon="clock">На проверке</St>}
          <div className="more">
            {doc.status === 'rejected' && <Note tone="bad" icon="warn">{doc.reason ?? 'Документ не подошёл.'}</Note>}
            <div className="row-s">
              {doc.status === 'rejected' && <Btn size="s" onClick={() => pick(doc)}>Загрузить заново</Btn>}
              <IBtn icon="trash" label={`Удалить ${doc.name}`} onClick={() => run(() => tApi.removeDoc(doc.id), 'Документ удалён')} />
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : <p className="small">Пока ничего не загружено.</p>;
  const why = (
    <div className="card">
      <b className="h3">Что даёт проверка</b>
      <div><St tone="ok" icon="shield">Документы проверены</St></div>
      <p className="small" style={{ fontSize: 15 }}>{`Значок появится в анкете и на карточке в каталоге. С ним вас выбирают в${NB}2${NB}раза${NB}чаще.`}</p>
      <Note icon="eye">Файлы видим только мы. Ученикам показываем только значок.</Note>
    </div>
  );
  if (phone)
    return (
      <Page title="Документы" back="/tutor/profile">
        <p className="sub">Необязательно. После проверки в анкете появится значок «Документы проверены». Файлы видим только мы.</p>
        {drop}
        <b className="h3">Загруженные</b>
        {list}
      </Page>
    );
  return (
    <Page title="Документы" kind="cabinet" side="Анкета">
      <div style={{ display: 'grid', gap: 8 }}>
        <div><Btn size="s" icon="left" to="/tutor/profile">К анкете</Btn></div>
        <h1 className="h1">Документы</h1>
        <p className="sub">Необязательно. После проверки в анкете появится значок «Документы проверены».</p>
      </div>
      <div className="cols c2">
        <div className="stack">{drop}<b className="h3">Загруженные</b>{list}</div>
        <div className="r2-stick" style={{ alignSelf: 'start' }}>{why}</div>
      </div>
    </Page>
  );
}
