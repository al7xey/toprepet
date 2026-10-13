import { useState } from 'react';
import { Btn, Chip, Empty, Input, Note, St } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, tutors as tApi } from '../../api';
import type { TutorDoc, TutorProfile } from '../../api/types';
import { fmtFileSize, nb } from '../../lib/text';
import { fmtDayTime, MSK } from '../../lib/time';
import { AdminPage, Who } from './shared';

const PRESETS = ['Не видно имени и даты', 'Документ не читается', 'Не относится к преподаванию'];

export default function AdminDocuments() {
  const d = useDb();
  const phone = usePhone();
  const { run } = useApp();
  const [reason, setReason] = useState<Record<string, string>>({});
  const all = d.tutors.flatMap(t => t.docs.map(doc => ({ t, doc })));
  const queue = all.filter(x => x.doc.status === 'review').sort((a, b) => a.doc.uploadedAt - b.doc.uploadedAt);
  const done = all.filter(x => x.doc.status !== 'review').sort((a, b) => b.doc.uploadedAt - a.doc.uploadedAt).slice(0, 12);
  const card = ({ t, doc }: { t: TutorProfile; doc: TutorDoc }) => {
    const r = reason[doc.id] ?? '';
    return (
      <div className="card" style={{ gap: 12 }} key={doc.id}>
        <Who tone={t.tone} src={t.photo} name={t.name} sub={t.subjects.map(s => s.subject).join(', ')} right={<St icon="clock">На проверке</St>} />
        <div className="r2-file" style={{ padding: 0 }}><span className="ic"><Icon name={/\.(jpe?g|png|webp|heic)$/i.test(doc.name) ? 'image' : 'doc'} /></span><span><b>{doc.name}</b><span className="small">{nb(`${doc.title ? `${doc.title} · ` : ''}${fmtFileSize(doc.size)} · загружен ${fmtDayTime(doc.uploadedAt, MSK)}`)}</span></span></div>
        <Note icon="eye">В демо файл не хранится. В рабочей версии здесь откроется предпросмотр из хранилища.</Note>
        <div className="r9-pick"><span>Если отклоняете</span><div className="r9-flag">{PRESETS.map(p => <Chip key={p} pressed={r === p} onClick={() => setReason(v => ({ ...v, [doc.id]: p }))}>{p}</Chip>)}</div></div>
        <Input placeholder="Или своя причина" value={r} onChange={e => setReason(v => ({ ...v, [doc.id]: e.target.value }))} aria-label="Причина отказа" />
        <div className="r9-two"><Btn v="primary" size="m" onClick={() => run(() => tApi.reviewDoc(t.userId, doc.id, true), `Проверено: ${t.name} получил(а) значок`)}>Проверено</Btn><Btn size="m" disabled={!r.trim()} onClick={() => run(() => tApi.reviewDoc(t.userId, doc.id, false, r), 'Документ отклонён, репетитор увидит причину')}>Отклонить</Btn></div>
      </div>
    );
  };
  const history = done.length > 0 && (
    <div className="card"><span className="h3">Недавно проверены</span>
      <div className="r2-files" style={{ boxShadow: 'none' }}>
        {done.map(({ t, doc }) => <div className="r2-file" key={doc.id}><span className="ic"><Icon name="doc" /></span><span><b>{doc.name}</b><span className="small">{t.name}{doc.reason ? ` · ${doc.reason}` : ''}</span></span>{doc.status === 'ok' ? <St tone="ok" icon="check">Проверено</St> : <St tone="bad" icon="x">Отклонено</St>}</div>)}
      </div>
    </div>
  );
  const list = queue.length ? queue.map(card) : <Empty icon="shield" title="Документов на проверке нет" style={{ maxWidth: 'none' }} />;
  if (phone) return <AdminPage title="Документы" side="Документы"><h1 className="h1">Документы</h1>{list}{history}</AdminPage>;
  return (
    <AdminPage title="Документы" side="Документы">
      <div className="title-block"><h1 className="h1">Проверка документов</h1><p className="sub">{`В очереди: ${queue.length}. После проверки в анкете появляется значок «Документы проверены».`}</p></div>
      <div className="cols c2"><div className="stack">{list}</div><div className="stack">{history}</div></div>
    </AdminPage>
  );
}
