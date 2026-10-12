import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Alert, Btn, Chip, Dropdown, Empty, Field, Input, MenuItem, Note, St, Textarea, Tz } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, requests as rq, schedule, tutors as tApi, tutorById, userById } from '../../api';
import { fmtMoney, parseMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { instrumental } from '../../lib/names';
import { NB, dateKey, fmtTime, utcLabel, weekdayShort, zoneCity, zoned } from '../../lib/time';
import { RequestCard } from './RequestCard';

export default function TutorRequest() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const t = tutorById(d, me.id);
  const r = d.requests.find(x => x.id === id);
  const defPrice = t && r ? (t.prices.find(p => p.subject === r.subject && p.minutes === 60)?.price ?? tApi.priceFrom(t)) : 0;
  const student = r && userById(d, r.studentId);
  const name = student?.name.split(' ')[0] ?? 'Ученик';
  const [msg, setMsg] = useState(() => `Здравствуйте, ${name}! `);
  const [price, setPrice] = useState(defPrice ? String(defPrice) : '');
  const [slots, setSlots] = useState<number[]>([]);
  const [tpl, setTpl] = useState(false);
  const [tried, setTried] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const free = useMemo(() => (t ? schedule.freeSlots(d, t, { minutes: 60, ignoreHorizon: true, untilDays: 14 }) : []), [d, t]);
  if (!r || !t) return <Page title="Заявка" back="/tutor/requests" kind="cabinet" side="Заявки"><Empty icon="doc" title="Заявка не найдена" action={<Btn to="/tutor/requests">Все заявки</Btn>} /></Page>;
  const mine = d.responses.find(x => x.requestId === r.id && x.tutorId === me.id);
  const n = rq.responseCount(d, r.id);
  const blocked = mine ? 'Вы уже откликнулись на эту заявку.' : !rq.visibleToTutors(r, at) ? 'Заявка уже не принимает отклики.' : n >= r.responseLimit ? 'У заявки уже 10 откликов.' : '';
  const match = rq.matches(d, t, r);
  const value = parseMoney(price);
  const stTz = student?.tz ?? 'Europe/Moscow';
  /* group candidate windows so the list stays short: by default up to 3 per day, the rest on demand */
  const perDay = new Map<string, number>();
  const candidates = free.filter(s => {
    const k = dateKey(s, me.tz);
    const c = perDay.get(k) ?? 0;
    perDay.set(k, c + 1);
    return showAll || c < 2;
  }).slice(0, showAll ? 40 : 12);
  const toggle = (s: number) => setSlots(x => (x.includes(s) ? x.filter(y => y !== s) : x.length >= 5 ? x : [...x, s].sort((a, b) => a - b)));
  const errMsg = tried && msg.trim().length < 20 ? 'Напишите ученику хотя бы пару предложений' : '';
  const errPrice = tried && value < 300 ? 'Укажите цену за 60 минут' : '';
  const errSlots = tried && (slots.length < 3 || slots.length > 5) ? 'Выберите от 3 до 5 окон' : '';
  const send = () => {
    setTried(true);
    if (msg.trim().length < 20 || value < 300 || slots.length < 3) return;
    const ok = run(() => rq.respond(r.id, msg, value, slots));
    if (ok) {
      toast(`Отклик отправлен — ${name} увидит его в заявке и чате`, { tone: 'ok' });
      navigate('/tutor/responses');
    }
  };
  const fmtSlot = (s: number, tz: string) => { const p = zoned(s, tz); return `${weekdayShort(p.weekday)} ${fmtTime(s, tz)}`; };

  const form = (
    <>
      <Field label="Сообщение" error={errMsg} style={{ maxWidth: 'none' }}>
        <Textarea className="r5-ta" aria-label="Сообщение" value={msg} maxLength={1000} invalid={!!errMsg} onChange={e => setMsg(e.target.value)} placeholder="Расскажите, как поможете с задачей ученика" />
        <div className="between">
          <span className="filter" data-dd-anchor>
            <Chip menu expanded={tpl} onClick={() => setTpl(v => !v)}>{t.templates.length ? 'Шаблон' : 'Шаблоны'}</Chip>
            <Dropdown open={tpl} onClose={() => setTpl(false)}>
              {t.templates.map(x => <MenuItem key={x.id} onClick={() => { setMsg(x.text.replace(/\{имя\}/g, name)); setTpl(false); }}>{x.title}</MenuItem>)}
              <MenuItem onClick={() => { setTpl(false); if (msg.trim().length < 20) return toast('Сначала напишите текст, который хотите сохранить', { tone: 'bad' }); const title = window.prompt('Название шаблона', r.subject.replace(/ язык$/, '')); if (title) run(() => tApi.saveTemplate(title, msg.replace(new RegExp(name, 'g'), '{имя}')), 'Шаблон сохранён'); }}>Сохранить текст как шаблон</MenuItem>
            </Dropdown>
          </span>
          <span className="counter" style={{ whiteSpace: 'nowrap' }}>{`${msg.length} / 1000`}</span>
        </div>
      </Field>
      <Field label="Ваша цена за 60 минут" error={errPrice} help={value ? nb(`${name} увидит ${fmtMoney(studentPrice(value))} — с сервисным сбором 10 %. Вы получите ${fmtMoney(value)}.`) : 'Ученик видит цену со сбором 10 %, вы получаете свою цену целиком.'} style={{ maxWidth: 'none' }}>
        <Input inputMode="numeric" value={value ? `${value.toLocaleString('ru-RU').replace(/\s/g, NB)}${NB}₽` : price} onChange={e => setPrice(String(parseMoney(e.target.value) || ''))} invalid={!!errPrice} style={{ maxWidth: 240 }} aria-label="Ваша цена за 60 минут, ₽" />
      </Field>
      {r.budget && value && studentPrice(value) > r.budget ? <Note tone="action" icon="info">{`С учётом сбора ${fmtMoney(studentPrice(value))} — выше бюджета ученика (${rq.fmtBudget(r.budget)}). Можно предложить, но шансы ниже.`}</Note> : null}
      <div className="field" style={{ maxWidth: 'none' }}>
        <div className="between" style={{ paddingLeft: 16 }}><span className="label" style={{ padding: 0 }}>Предложите 3–5 окон</span><span className="small" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{`выбрано ${slots.length} из 5`}</span></div>
        <span style={{ paddingLeft: 16 }}><Tz>{`Ваше время, ${utcLabel(me.tz)} ${zoneCity(me.tz)}`}</Tz></span>
        {candidates.length ? (
          <div className="r5-slots">
            {candidates.map(s => { const p = zoned(s, me.tz); return <button key={s} type="button" className="slot r5-slot" aria-pressed={slots.includes(s)} onClick={() => toggle(s)}><small>{`${weekdayShort(p.weekday)}${NB}${p.day}`}</small>{fmtTime(s, me.tz)}</button>; })}
          </div>
        ) : <Note tone="action">Свободных окон на 2 недели нет. Откройте время в расписании, чтобы предложить его ученику.</Note>}
        {!showAll && free.length > candidates.length && <div><Btn size="s" onClick={() => setShowAll(true)}>Показать все окна</Btn></div>}
        {errSlots ? <span className="err" role="alert"><Icon name="warn" />{errSlots}</span> : slots.length > 0 && stTz !== me.tz ? <span className="help">{nb(`${name} увидит их по ${zoneCity(stTz) === 'Москва' ? 'Москве' : `своему времени (${zoneCity(stTz)})`}: ${slots.map(s => fmtSlot(s, stTz)).join(', ')}`)}</span> : null}
      </div>
      <Note className="r5-pn" icon="chat">{`После отклика откроется чат с ${name === 'Ученик' ? 'учеником' : instrumental(name)}. Первым написать ученику можно только так.`}</Note>
    </>
  );
  const head = (
    <article className="card" style={{ gap: 8 }}>
      <div className="r5-rqtop"><h3>{r.title}</h3>{match && <St tone="ok" icon="check">Подходит вам</St>}</div>
      <div className="r5-meta"><span>{nb(`${r.level} · ${r.format === 'online' ? 'онлайн' : 'очно'} · ${rq.fmtBudget(r.budget)}`)}</span><span>{rq.fmtTimes(r.times)}</span><span>{`${r.frequency} · ${rq.requestWho(d, r)}`}</span></div>
    </article>
  );
  if (blocked)
    return (
      <Page title="Отклик" back="/tutor/requests" kind="cabinet" side="Заявки" className="r5">
        {!phone && <div><Btn size="s" icon="left" to="/tutor/requests">Все заявки</Btn></div>}
        <RequestCard r={r} match={match} />
        <Alert tone={mine ? 'ok' : 'action'} icon={mine ? 'check' : 'info'} title={blocked} style={{ maxWidth: 'none' }} action={mine ? <Btn v="white" size="s" to="/tutor/responses">Мои отклики</Btn> : <Btn v="white" size="s" to="/tutor/requests">Другие заявки</Btn>}>{mine ? `Ваша цена ${fmtMoney(mine.price)}, ${mine.slots.length} окна.` : 'Посмотрите другие заявки по вашим предметам.'}</Alert>
      </Page>
    );
  if (phone)
    return (
      <Page title="Отклик" back="/tutor/requests" className="r5" bottom={<ActionBar><Btn v="primary" onClick={send}>Отправить отклик</Btn></ActionBar>}>
        {!t.published && <Alert tone="action" icon="user" title="Сначала опубликуйте анкету" action={<Btn v="white" size="s" to="/tutor/profile/publish">Опубликовать</Btn>}>Откликаться могут репетиторы с опубликованной анкетой.</Alert>}
        {head}
        {r.goal && <div className="r5-quote">{nb(r.goal)}</div>}
        {form}
      </Page>
    );
  return (
    <Page title="Отклик" kind="cabinet" side="Заявки" className="r5">
      <div><Btn size="s" icon="left" to="/tutor/requests">Все заявки</Btn></div>
      {!t.published && <Alert tone="action" icon="user" title="Сначала опубликуйте анкету" action={<Btn v="white" size="s" to="/tutor/profile/publish">Опубликовать</Btn>}>Откликаться могут репетиторы с опубликованной анкетой.</Alert>}
      <div className="cols c2" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        <div className="card" style={{ gap: 22, padding: 24 }}>
          <h1 className="h2">Ваш отклик</h1>
          {form}
          <div><Btn v="primary" onClick={send}>Отправить отклик</Btn></div>
        </div>
        <div className="r5-stick"><RequestCard r={r} match={match} showLevel footRight={<span>{`откликов ${n} из ${r.responseLimit}`}</span>} /></div>
      </div>
    </Page>
  );
}
