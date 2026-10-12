import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Alert, Ava, Btn, Chip, Empty, Field, Note, Sheet, St, Stars, Textarea } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, reviews as rv, lessonById, userById } from '../../api';
import type { Review } from '../../api/types';
import { nb } from '../../lib/text';
import { fmtAgo, fmtDay } from '../../lib/time';

const REASONS = ['Контакты', 'Оскорбления', 'Не про урок'];

export default function TutorReviews() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const { run } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [complain, setComplain] = useState<Review | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [why, setWhy] = useState('');
  const list = d.reviews.filter(r => r.tutorId === me.id && (r.status === 'published' || r.complaint)).sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt));
  const rating = rv.tutorRating(d, me.id);
  const noReply = list.filter(r => r.status === 'published' && !r.reply);
  const fresh = noReply[0];
  const who = (r: Review) => {
    const u = userById(d, r.studentId);
    const l = lessonById(d, r.lessonId);
    return { name: l?.participant.name ?? u?.name.split(' ')[0] ?? 'Ученик', tone: u?.tone ?? 'teal', photo: u?.photo, sub: l ? `Урок ${fmtDay(l.start, me.tz)}` : fmtAgo(r.createdAt) };
  };
  const card = (r: Review) => {
    const w = who(r);
    const draft = drafts[r.id] ?? '';
    const head = <div className="r9-who"><Ava tone={w.tone} src={w.photo} /><div><b>{w.name}</b><span>{w.sub}</span></div>{r.complaint?.status === 'open' ? <St icon="clock">Жалоба на проверке</St> : r.status === 'rejected' ? <St tone="bad" icon="x">Снят с публикации</St> : !r.reply ? <St tone="action">Без ответа</St> : null}</div>;
    if (r.reply || r.status !== 'published')
      return (
        <div className="card" key={r.id}>
          <div className="r9-rev">
            {head}<Stars n={r.rating} /><p>{nb(r.text)}</p>
            {r.reply && <div className="r9-reply"><b>Ваш ответ</b><span>{nb(r.reply.text)}</span></div>}
            {r.complaint && r.complaint.status !== 'open' && <Note icon="shield">{r.complaint.status === 'removed' ? 'Жалоба принята, отзыв снят с публикации.' : 'Жалобу рассмотрели: нарушений нет, отзыв остаётся.'}</Note>}
          </div>
        </div>
      );
    return (
      <div className="card" style={{ gap: 12 }} key={r.id}>
        {head}<Stars n={r.rating} /><p>{nb(r.text)}</p>
        <Field label="Ваш публичный ответ" htmlFor={`rp-${r.id}`} help="Ответ увидят все, кто открывает вашу анкету" style={{ maxWidth: 'none' }}>
          <Textarea id={`rp-${r.id}`} value={draft} onChange={e => setDrafts(x => ({ ...x, [r.id]: e.target.value }))} placeholder="Спасибо за отзыв…" style={{ minHeight: 96 }} maxLength={1000} />
        </Field>
        <div className="row-s">
          <Btn v="primary" size="m" disabled={draft.trim().length < 3} onClick={() => run(() => rv.replyToReview(r.id, draft), 'Ответ опубликован')}>Ответить</Btn>
          {!r.complaint && <Btn size="m" onClick={() => { setComplain(r); setReason(REASONS[0]); setWhy(''); }}>Пожаловаться</Btn>}
        </div>
      </div>
    );
  };
  const stats = (
    <div className="kpis r9-kpis">
      <div className="kpi"><span>Рейтинг</span><b>{rating.count ? rv.fmtRating(rating.avg) : '—'}</b></div>
      <div className="kpi"><span>Отзывов</span><b>{rating.count}</b></div>
      <div className="kpi"><span>Без ответа</span><b>{noReply.length}</b></div>
    </div>
  );
  const alert = fresh && <Alert tone="action" icon="star" title={`${who(fresh).name} оставил(а) отзыв на ${fresh.rating} ${fresh.rating === 1 ? 'звезду' : fresh.rating < 5 ? 'звезды' : 'звёзд'}`} style={{ maxWidth: 'none' }}>Прошёл проверку, уже в анкете. Можно ответить публично.</Alert>;
  const body = list.length ? list.map(card) : <Empty icon="star" title="Отзывов пока нет" style={{ maxWidth: 'none' }}>Ученики оставляют отзыв после первого оплаченного урока и затем каждого пятого.</Empty>;
  const sheet = (
    <Sheet open={!!complain} onClose={() => setComplain(null)} title="Пожаловаться на отзыв">
      {complain && <div className="msg msg--in" style={{ maxWidth: 'none', background: 'var(--bg)', boxShadow: 'none' }}>{nb(complain.text)}</div>}
      <div className="r9-pick"><span>Причина</span><div className="r9-flag">{REASONS.map(x => <Chip key={x} pressed={reason === x} onClick={() => setReason(x)}>{x}</Chip>)}</div></div>
      <Field label="Подробнее" optional="необязательно" htmlFor="cmp-why" style={{ maxWidth: 'none' }}><Textarea id="cmp-why" value={why} onChange={e => setWhy(e.target.value)} style={{ minHeight: 84 }} /></Field>
      <Note icon="shield">Модератор проверит отзыв и ответит вам. Ученик не узнает о жалобе.</Note>
      <Btn v="primary" block onClick={() => { const r = complain!; if (run(() => { rv.complainReview(r.id, reason, why); return true; }, 'Жалоба отправлена модератору')) setComplain(null); }}>Отправить жалобу</Btn>
    </Sheet>
  );
  if (phone)
    return (
      <Page title="Отзывы" back="/tutor/profile">
        {alert}{stats}{body}{sheet}
      </Page>
    );
  return (
    <Page title="Отзывы" kind="cabinet" side="Отзывы">
      <div className="title-block"><h1 className="h1">Отзывы</h1><p className="sub">Отзывы учеников после оплаченных уроков</p></div>
      {alert}
      <div className="cols c2">
        <div className="stack">{body}</div>
        <div className="stack">{stats}<div className="card"><span className="h3">Когда можно пожаловаться</span><Note icon="shield">Если в отзыве контакты, оскорбления или текст не про урок. Модератор проверит и ответит вам.</Note></div></div>
      </div>
      {sheet}
    </Page>
  );
}
