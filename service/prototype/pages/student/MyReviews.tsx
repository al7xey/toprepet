import { Page } from '../../ui/layout';
import { Alert, Ava, Btn, Empty, Note, St, Stars } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useDb, useSession, lessonById, tutorById } from '../../api';
import type { Review } from '../../api/types';
import { nb } from '../../lib/text';
import { instrumental } from '../../lib/names';
import { fmtDay } from '../../lib/time';

export default function MyReviews() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const list = d.reviews.filter(r => r.studentId === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const waiting = d.lessons.filter(l => l.studentId === me.id && l.status === 'completed' && l.kind === 'lesson' && l.tutorPrice > 0 && l.reviewAsked && !d.reviews.some(r => r.lessonId === l.id));
  const card = (r: Review) => {
    const t = tutorById(d, r.tutorId);
    const l = lessonById(d, r.lessonId);
    return (
      <div className="card" key={r.id}>
        <div className="r9-who"><Ava tone={t?.tone ?? 'orange'} src={t?.photo} /><div><b>{t?.name ?? 'Репетитор'}</b><span>{l ? `Урок ${fmtDay(l.start, me.tz)}` : ''}</span></div>{r.status === 'published' ? <St tone="ok" icon="check">Опубликован</St> : r.status === 'review' ? <St tone="action" icon="clock">На проверке</St> : <St tone="bad" icon="x">Отклонён</St>}</div>
        <Stars n={r.rating} />
        <p>{nb(r.text)}</p>
        {r.status === 'review' && <span className="small">Проверяем обычно за сутки</span>}
        {r.status === 'rejected' && <><Note tone="bad" icon="warn">{`Причина: ${r.reason?.toLowerCase() ?? 'не прошёл проверку'}. Исправьте и отправьте снова.`}</Note><div><Btn size="s" to={`/my/lessons/${r.lessonId}/review`}>Исправить</Btn></div></>}
        {r.reply && <div className="r9-reply"><b>{`Ответ ${t?.name.split(' ')[0] ?? 'репетитора'}`}</b><span>{nb(r.reply.text)}</span></div>}
      </div>
    );
  };
  const ask = waiting.map(l => {
    const t = tutorById(d, l.tutorId);
    return <Alert key={l.id} tone="action" icon="star" title={`Как прошёл урок с ${instrumental(t?.name.split(' ')[0] ?? 'репетитором')}?`} style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={`/my/lessons/${l.id}/review`}>Оставить отзыв</Btn>}>{`${fmtDay(l.start, me.tz)} · ${l.subject}. Отзыв поможет другим ученикам.`}</Alert>;
  });
  const body = list.length ? list.map(card) : !waiting.length && <Empty icon="star" title="Отзывов пока нет" style={{ maxWidth: 'none' }}>Оставить отзыв можно после оплаченного урока — мы напомним.</Empty>;
  const rules = (
    <div className="card"><span className="h3">Как мы проверяем отзывы</span>
      <Note icon="check">Оставить отзыв можно только после оплаченного урока.</Note>
      <Note icon="shield">Не публикуем контакты, оскорбления и текст не про урок.</Note>
      <Note icon="chat">Репетитор может публично ответить на отзыв.</Note>
    </div>
  );
  if (phone) return <Page title="Мои отзывы" back="/account">{ask}{body}</Page>;
  return (
    <Page title="Мои отзывы" kind="cabinet" side="Мои репетиторы">
      <div className="title-block"><h1 className="h1">Мои отзывы</h1><p className="sub">Отзывы появляются в анкете после проверки</p></div>
      <div className="cols c2"><div className="stack" style={{ gap: 14 }}>{ask}{body}</div>{rules}</div>
    </Page>
  );
}
