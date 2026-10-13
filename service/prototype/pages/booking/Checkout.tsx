import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page, ActionBar } from '../../ui/layout';
import { Btn, Empty, Kv, Note, Sheet, Textarea } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { PayMethods, Person, TzLine, payInput, type PayChoice } from '../../ui/domain';
import { usePhone, useCountdown } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutorBySlug, booking, rules, ApiError } from '../../api';
import { genitive, instrumental as instr } from '../../lib/names';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { fmtDayTime, NB } from '../../lib/time';

export default function Checkout() {
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { toast } = useApp();
  const t = tutorBySlug(d, sp.get('tutor') ?? '');
  const start = Number(sp.get('start'));
  const minutes = Number(sp.get('minutes')) || 60;
  const subject = sp.get('subject') ?? '';
  const who = sp.get('who') ?? 'self';
  const responseId = sp.get('response') ?? undefined;
  const response = responseId ? d.responses.find(r => r.id === responseId) : undefined;

  const [comment, setComment] = useState('');
  const [choice, setChoice] = useState<PayChoice>(me.cards[0] ? { kind: 'saved', cardId: me.cards[0].id } : { kind: 'new' });
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [save, setSave] = useState(true);
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [cardErr, setCardErr] = useState<Partial<Record<'number' | 'exp' | 'cvc', string>>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ message: string; until: number } | null>(null);

  if (!t || !start || !subject) return <Page title="Подтверждение" back="/teachers"><Empty title="Запись не найдена" action={<Btn to="/teachers">Выбрать репетитора</Btn>}>Выберите репетитора и время ещё раз.</Empty></Page>;
  const first = t.name.split(' ')[0];
  const tutorPrice = response ? Math.round((response.price * minutes) / 60) : (t.prices.find(p => p.subject === subject && p.minutes === minutes)?.price ?? 0);
  let q: booking.Quote = { tutorPrice, studentPrice: studentPrice(tutorPrice), discount: 0, total: studentPrice(tutorPrice) };
  try {
    if (promoApplied) q = booking.quote(tutorPrice, promoApplied, me);
  } catch {
    /* promo became invalid */
  }
  const participant = booking.participantFor(me, who);
  const freeUntil = rules.freeCancelUntil({ start });

  const applyPromo = () => {
    setPromoErr('');
    try {
      booking.quote(tutorPrice, promo, me);
      setPromoApplied(promo);
      toast('Промокод применён', { tone: 'ok' });
    } catch (e) {
      setPromoErr(e instanceof ApiError ? e.message : 'Промокод не подошёл');
    }
  };

  const pay = (override?: PayChoice) => {
    setBusy(true);
    setCardErr({});
    try {
      const lesson = booking.bookLesson({ tutorId: t.userId, start, minutes, subject, kind: 'lesson', participant, comment, method: payInput(override ?? choice, card, save), promo: promoApplied || undefined, responseId });
      toast(`${fmtMoney(q.total)} заморожены, ${first} получил(а) вашу запись`, { tone: 'ok' });
      navigate(`/my/lessons/${lesson.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'payment') setFailure({ message: e.message, until: (e.data as { expiresAt: number }).expiresAt });
      else if (e instanceof ApiError && e.code === 'card') setCardErr(e.data as typeof cardErr);
      else toast(e instanceof Error ? e.message : 'Не получилось', { tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  const left = (
    <>
      <section className="card">
        <div className="between"><h3 className="h3 nowrap">Ваша запись</h3><Btn size="s" to={`/teachers/${t.slug}/book?subject=${encodeURIComponent(subject)}&minutes=${minutes}`}>Другое время</Btn></div>
        <Person name={t.name} sub={`${subject.replace(/ язык$/, '')} · ${minutes} мин`} tone={t.tone} src={t.photo} />
        <Kv rows={[['Когда', fmtDayTime(start, me.tz)], ['Занимается', participant.kind === 'child' ? `${participant.name}, ${participant.age}` : participant.name], ...(response ? [['По заявке', 'отклик репетитора'] as [string, string]] : [])]} />
        <TzLine viewerTz={me.tz} otherTz={t.tz} otherName={genitive(first)} sample={start} />
        <div className="field" style={{ maxWidth: 'none' }}>
          <label htmlFor="cmt">{`Комментарий для ${genitive(first)}`} <span className="opt">необязательно</span></label>
          <Textarea id="cmt" className="r4-ta" value={comment} maxLength={500} onChange={e => setComment(e.target.value)} placeholder="Цель, уровень, что хотите разобрать" />
        </div>
      </section>
      <section className="card"><h3 className="h3">Способ оплаты</h3><PayMethods me={me} value={choice} onChange={setChoice} card={card} setCard={setCard} save={save} setSave={setSave} errors={cardErr} /></section>
    </>
  );
  const promoRow = (
    <div style={{ display: 'grid', gap: 6 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
        <input className="input" aria-label="Промокод" placeholder="Промокод" value={promo} onChange={e => setPromo(e.target.value)} style={{ flex: 1 }} aria-invalid={!!promoErr || undefined} />
        <Btn size="m" onClick={applyPromo} disabled={!promo.trim()}>Применить</Btn>
      </div>
      {promoErr && <span className="err">{promoErr}</span>}
    </div>
  );
  const payLabel = `Заморозить ${fmtMoney(q.total)}`;
  const hint = nb(`Спишем, когда ${first} подтвердит запись. Если не подтвердит, заморозка снимется. Бесплатная отмена до ${fmtDayTime(freeUntil, me.tz)}, позже деньги получит репетитор.`);

  const failBody = failure && <FailBody failure={failure} start={start} tz={me.tz} onOther={() => { setFailure(null); setChoice({ kind: 'new' }); }} onSbp={() => { setFailure(null); setChoice({ kind: 'sbp' }); pay({ kind: 'sbp' }); }} />;

  if (phone) {
    if (failure)
      return (
        <Page title="Оплата" back={true} hideTabs>
          <section className="card r4-center" style={{ padding: '28px 20px', gap: 14, marginTop: 24 }}>{failBody}</section>
          <Note icon="info">Если банк отклоняет снова, позвоните в банк или выберите СБП.</Note>
        </Page>
      );
    return (
      <Page title="Подтверждение" back={true} bottom={<ActionBar><Btn v="primary" loading={busy} onClick={() => pay()}>{payLabel}</Btn></ActionBar>}>
        {left}
        <section className="card">
          <h3 className="h3">Сумма</h3>
          <Kv rows={[[`Урок с ${instr(first)}, ${minutes} мин`, fmtMoney(q.studentPrice)], ...(q.discount ? [[`Промокод ${q.promo}`, `−${fmtMoney(q.discount)}`] as [string, string]] : []), ['К оплате', fmtMoney(q.total)]]} />
          {promoRow}
          <Note tone="action" icon="info">{`Сейчас ${fmtMoney(q.total)} только заморозим на карте. Спишем, когда ${first} подтвердит запись.`}</Note>
          <Note icon="clock">{`Бесплатная отмена до ${fmtDayTime(freeUntil, me.tz)}. Позже деньги получит репетитор.`}</Note>
        </section>
      </Page>
    );
  }
  return (
    <Page title="Подтверждение и оплата">
      <div className="title-block"><h1 className="h1">Подтверждение и оплата</h1></div>
      <div className="cols c2">
        <div className="stack">{left}</div>
        <aside className="summary r4" style={{ position: 'sticky', top: 90 }}>
          <h4>Ваше занятие</h4>
          <dl>
            <div><dt>Когда</dt><dd>{nb(fmtDayTime(start, me.tz))}</dd></div>
            <div><dt>Предмет</dt><dd>{subject.replace(/ язык$/, '')}, {minutes}{NB}мин</dd></div>
            <div><dt>Урок, {minutes}{NB}мин</dt><dd>{fmtMoney(q.studentPrice)}</dd></div>
            {q.discount > 0 && <div><dt>Промокод {q.promo}</dt><dd>−{fmtMoney(q.discount)}</dd></div>}
          </dl>
          {promoRow}
          <div className="total"><span>К оплате</span><b>{fmtMoney(q.total)}</b></div>
          <Btn v="primary" block loading={busy} onClick={() => pay()}>{payLabel}</Btn>
          <span className="hint">{hint}</span>
        </aside>
      </div>
      <Sheet open={!!failure} onClose={() => setFailure(null)}>
        <div className="r4 r4-center" style={{ display: 'grid', gap: 14 }}>{failBody}</div>
      </Sheet>
    </Page>
  );
}

function FailBody({ failure, start, tz, onOther, onSbp }: { failure: { message: string; until: number }; start: number; tz: string; onOther: () => void; onSbp: () => void }) {
  const cd = useCountdown(failure.until);
  return (
    <>
      <span className="r4-ic bad l" style={{ justifySelf: 'center' }}><Icon name="card" /></span>
      <h2 className="h2">Банк отклонил оплату</h2>
      <p className="sub">{nb(failure.message)}</p>
      {cd.left > 0 ? <Note tone="action" icon="clock">{`${fmtDayTime(start, tz)} закреплено за вами ещё ${cd.label}`}</Note> : <Note tone="bad" icon="warn">Время закрепления вышло, окно могут занять.</Note>}
      <div style={{ display: 'grid', gap: 8, width: '100%' }}>
        <Btn v="primary" block onClick={onOther}>Оплатить другой картой</Btn>
        <Btn block onClick={onSbp}>Оплатить через СБП</Btn>
      </div>
    </>
  );
}
