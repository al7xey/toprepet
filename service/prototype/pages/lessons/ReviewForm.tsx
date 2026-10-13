import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Empty, Note, RateInput, Sheet, St, TextField } from '../../ui/kit';
import { LessonCard, Person } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, reviews, lessonById, tutorById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { instrumental } from '../../lib/names';
import { fmtDay, fmtDayTime } from '../../lib/time';
import { paidOf } from './shared';

export default function ReviewForm() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const l = lessonById(d, id);
  const old = l && d.reviews.find(r => r.lessonId === l.id);
  const [rating, setRating] = useState(old?.rating ?? 0);
  const [text, setText] = useState(old?.text ?? '');
  const [tried, setTried] = useState(false);
  const t = l && tutorById(d, l.tutorId);
  if (!l || !t || l.studentId !== me.id) return <Page title="Отзыв" back="/my/lessons"><Empty icon="star" title="Урок не найден" /></Page>;
  const back = `/my/lessons/${l.id}`;
  const first = t.name.split(' ')[0];
  const blocked = l.kind !== 'lesson' || l.tutorPrice <= 0 ? 'Отзыв можно оставить только после оплаченного урока.' : l.status !== 'completed' ? 'Сначала подтвердите, что урок состоялся.' : old && old.status !== 'rejected' ? 'Отзыв по этому уроку уже отправлен.' : '';
  const card = (
    <LessonCard
      when={fmtDayTime(l.start, me.tz)}
      sub={`${l.subject}, ${l.minutes} мин`}
      status={<St tone="ok" icon="check">Проведён</St>}
      person={<Person name={t.name} sub={l.subject} tone={t.tone} src={t.photo} />}
      facts={[['card', `Оплачено ${fmtMoney(paidOf(l))}`], ['clock', `${l.minutes} мин`]]}
    />
  );
  const errRating = tried && !rating ? 'Поставьте оценку' : '';
  const errText = tried && text.trim().length < 10 ? 'Напишите пару слов о уроке' : '';
  const send = () => {
    setTried(true);
    if (!rating || text.trim().length < 10) return;
    const ok = run(() => reviews.leaveReview(l.id, rating, text));
    if (ok) {
      toast('Отзыв отправлен на проверку', { tone: 'ok' });
      navigate('/account/reviews', { replace: true });
    }
  };
  const form = blocked ? (
    <Empty icon="star" title="Отзыв оставить нельзя" action={<Btn to={back}>К уроку</Btn>} style={{ boxShadow: 'none', padding: 12 }}>{blocked}</Empty>
  ) : (
    <>
      <div style={{ display: 'grid', gap: 4 }}><h2 className="h2">{`Как прошёл урок с ${instrumental(first)}?`}</h2><span className="sub" style={{ fontSize: 14 }}>{`${fmtDay(l.start, me.tz)} · ${l.subject}, ${l.minutes} мин`}</span></div>
      <RateInput value={rating} onChange={setRating} />
      {errRating && <span className="err" role="alert">{errRating}</span>}
      {old?.status === 'rejected' && <Note tone="bad" icon="warn">{`Прошлый вариант не прошёл проверку: ${old.reason}. Исправьте текст.`}</Note>}
      <TextField label="Что понравилось или нет" multiline rows={4} value={text} onChange={setText} error={errText} maxLength={1000} style={{ maxWidth: 'none' }} placeholder="Например: отработали самопрезентацию, стало спокойнее" />
      <Note icon="shield">Отзыв появится в анкете после проверки, обычно за сутки.</Note>
      <div className={phone ? 'r9-pick' : 'row-s'} style={{ gap: 8 }}>
        <Btn v="primary" size="m" block={phone} onClick={send}>Отправить</Btn>
        <Btn size="m" block={phone} onClick={() => navigate(back)}>Позже</Btn>
      </div>
    </>
  );
  return (
    <Page title="Отзыв" back={back} mTitle="Урок" kind="cabinet" side="Мои уроки">
      {!phone && <h1 className="h1">Мои уроки</h1>}
      {phone ? card : <div className="cols c2"><div className="stack">{card}</div><div /></div>}
      <Sheet open onClose={() => navigate(back)} wide>{form}</Sheet>
    </Page>
  );
}
