import { useState } from 'react';
import { Btn, Chip, Empty, Note, Seg, St, Stars } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, reviews as rv, lessonById, tutorById, userById } from '../../api';
import type { Review } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { findContacts, nb } from '../../lib/text';
import { fmtDay, MSK } from '../../lib/time';
import { AdminPage, Who } from './shared';

const REASONS = ['Контакты', 'Оскорбления', 'Не про урок'];

export default function AdminReviews() {
  const d = useDb();
  const phone = usePhone();
  const { run } = useApp();
  const [tab, setTab] = useState<'new' | 'complaints'>('new');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const fresh = d.reviews.filter(r => r.status === 'review').sort((a, b) => a.createdAt - b.createdAt);
  const complaints = d.reviews.filter(r => r.complaint?.status === 'open');
  const head = (r: Review) => {
    const st = userById(d, r.studentId);
    const t = tutorById(d, r.tutorId);
    const l = lessonById(d, r.lessonId);
    return <Who tone={st?.tone ?? 'teal'} src={st?.photo} name={`${l?.participant.name ?? st?.name ?? 'Ученик'} → ${t?.name ?? ''}`} sub={l ? nb(`Урок ${fmtDay(l.start, MSK)} оплачен · ${fmtMoney(l.studentPrice - l.discount)}`) : ''} />;
  };
  const card = (r: Review) => {
    const flag = findContacts(r.text);
    const reason = reasons[r.id] ?? (flag ? 'Контакты' : '');
    return (
      <div className="card" style={{ gap: 12 }} key={r.id}>
        {head(r)}
        <div className="row-s"><Stars n={r.rating} />{flag && <St tone="bad" icon="warn">Похоже на контакты</St>}</div>
        <p>{nb(r.text)}</p>
        <div className="r9-pick"><span>Причина отказа</span><div className="r9-flag">{REASONS.map(x => <Chip key={x} pressed={reason === x} onClick={() => setReasons(v => ({ ...v, [r.id]: x }))}>{x}</Chip>)}</div></div>
        <div className="r9-two">
          {flag ? <><Btn v="danger" size="m" disabled={!reason} onClick={() => run(() => rv.moderateReview(r.id, false, reason), 'Отзыв отклонён, автор увидит причину')}>Отклонить</Btn><Btn size="m" onClick={() => run(() => rv.moderateReview(r.id, true), 'Отзыв опубликован')}>Опубликовать</Btn></>
            : <><Btn v="primary" size="m" onClick={() => run(() => rv.moderateReview(r.id, true), 'Отзыв опубликован')}>Опубликовать</Btn><Btn size="m" disabled={!reason} onClick={() => run(() => rv.moderateReview(r.id, false, reason), 'Отзыв отклонён, автор увидит причину')}>Отклонить</Btn></>}
        </div>
      </div>
    );
  };
  const complaintCard = (r: Review) => (
    <div className="card" style={{ gap: 12 }} key={r.id}>
      {head(r)}
      <Stars n={r.rating} />
      <p>{nb(r.text)}</p>
      <Note tone="action" icon="flag">{`Жалоба репетитора: ${r.complaint!.reason}${r.complaint!.text ? `. ${r.complaint!.text}` : ''}`}</Note>
      <div className="r9-two">
        <Btn v="danger" size="m" onClick={() => run(() => rv.resolveReviewComplaint(r.id, true), 'Отзыв снят с публикации')}>Снять отзыв</Btn>
        <Btn size="m" onClick={() => run(() => rv.resolveReviewComplaint(r.id, false), 'Отзыв остаётся, репетитор получит ответ')}>Оставить</Btn>
      </div>
    </div>
  );
  const tabs = <Seg label="Очередь" value={tab} onChange={setTab} items={[{ value: 'new', label: `Новые · ${fresh.length}` }, { value: 'complaints', label: `Жалобы · ${complaints.length}` }]} />;
  const list = tab === 'new' ? (fresh.length ? fresh.map(card) : <Empty icon="check" title="Новых отзывов нет" style={{ maxWidth: 'none' }}>Все отзывы проверены.</Empty>) : complaints.length ? complaints.map(complaintCard) : <Empty icon="check" title="Жалоб нет" style={{ maxWidth: 'none' }} />;
  const rules = (
    <div className="card"><span className="h3">Правила</span>
      <Note icon="check">Отзыв только после оплаченного урока, это проверяем автоматически.</Note>
      <Note icon="x">Отклоняем: контакты, оскорбления, текст не про урок.</Note>
      <Note icon="chat">Причину отказа видит автор и может исправить отзыв.</Note>
    </div>
  );
  if (phone) return <AdminPage title="Отзывы" side="Отзывы"><h1 className="h1">Отзывы</h1><div>{tabs}</div>{list}</AdminPage>;
  return (
    <AdminPage title="Отзывы" side="Отзывы">
      <div className="between"><h1 className="h1">Модерация отзывов</h1>{tabs}</div>
      <div className="cols c2"><div className="stack">{list}</div>{rules}</div>
    </AdminPage>
  );
}
