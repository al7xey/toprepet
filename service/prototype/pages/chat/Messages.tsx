import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Ava, Btn, Dropdown, Empty, IBtn, Note, Options, Sheet, Switch, Tz } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, chat as chatApi, rules, reviews as rv, schedule, tutorById, userById } from '../../api';
import type { Chat, Db, User } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { genitive } from '../../lib/names';
import { NB, fmtChatTime, fmtDayTime, fmtTime, utcLabel, weekdayShort, zoneCity, zoned, dateKey } from '../../lib/time';
import { Composer, Thread, preview } from './thread';

const REASONS = ['Просит оплату вне TopRepet', 'Грубость или оскорбления', 'Спам или реклама', 'Другое'];

function partnerOf(d: Db, c: Chat, me: User) {
  if (c.kind === 'support') return { name: 'Поддержка TopRepet', tone: undefined, photo: undefined, support: true };
  const otherId = chatApi.chatPartnerId(c, me.id);
  const t = tutorById(d, otherId);
  if (t) return { name: t.name, tone: t.tone, photo: t.photo, tutor: t, support: false };
  const u = userById(d, otherId);
  return { name: u?.name ?? 'Пользователь', tone: u?.tone ?? 'teal', photo: u?.photo, support: false };
}

function ChatAva({ p }: { p: ReturnType<typeof partnerOf> }) {
  if (p.support) return <span className="r6-sup"><Icon name="help" /></span>;
  return <Ava tone={p.tone!} src={p.photo} />;
}

export default function Messages() {
  const { chatId } = useParams();
  const [sp, setSp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [block, setBlock] = useState(true);
  const [propose, setPropose] = useState(sp.get('propose') === '1');
  const chats = chatApi.myChats(d, me);
  const current = chatId ? d.chats.find(c => c.id === chatId && (c.studentId === me.id || c.tutorId === me.id || c.userId === me.id)) : undefined;
  const list = current && !chats.includes(current) ? [current, ...chats] : chats;
  const messages = useMemo(() => (current ? d.messages.filter(m => m.chatId === current.id).sort((a, b) => a.createdAt - b.createdAt) : []), [d, current]);
  useEffect(() => {
    if (current && messages.length) chatApi.markRead(current.id);
  }, [current?.id, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setText(''), [chatId]);
  if (chatId && !current) return <Page title="Сообщения" back="/messages" kind="cabinet" side="Сообщения"><Empty icon="chat" title="Чат не найден" action={<Btn to="/messages">Все чаты</Btn>} /></Page>;
  if (current?.kind === 'support') return <Navigate to="/support" replace />;
  const tutorView = me.role === 'tutor';

  /* ---------- list ---------- */
  const filtered = list.filter(c => !q.trim() || partnerOf(d, c, me).name.toLowerCase().includes(q.trim().toLowerCase()));
  const listEl = (
    <div className="r6-list" style={phone ? { padding: 8 } : undefined}>
      {!phone && <label className="search"><Icon name="search" /><input placeholder="Поиск по чатам" value={q} onChange={e => setQ(e.target.value)} aria-label="Поиск по чатам" /></label>}
      {filtered.map(c => {
        const p = partnerOf(d, c, me);
        const last = [...d.messages].reverse().find(m => m.chatId === c.id);
        const unread = chatApi.unreadIn(d, c.id, me);
        return (
          <Link key={c.id} className="r6-ci" to={c.kind === 'support' ? '/support' : `/messages/${c.id}`} aria-current={c.id === chatId ? 'true' : undefined}>
            <ChatAva p={p} />
            <span className="t"><b>{p.name}</b><span className={unread ? 'unr' : undefined}>{preview(last, me, tutorView)}</span></span>
            <span className="r">{last ? fmtChatTime(last.createdAt, me.tz) : ''}{unread ? <span className="nv-badge">{unread}</span> : null}</span>
          </Link>
        );
      })}
      {!filtered.length && <p className="small" style={{ padding: 12, textAlign: 'center' }}>{q ? 'Никого не нашли' : 'Чатов пока нет'}</p>}
    </div>
  );

  if (!current) {
    const empty = (
      <Empty icon="chat" title={chats.length ? 'Выберите чат' : 'Сообщений пока нет'} style={{ boxShadow: 'none' }} action={!chats.length ? <Btn v="primary" to={tutorView ? '/tutor/requests' : '/teachers'}>{tutorView ? 'Заявки учеников' : 'Найти репетитора'}</Btn> : undefined}>
        {tutorView ? 'Здесь переписка с учениками, записи на уроки и оплаты.' : 'Здесь переписка с репетиторами, записи на уроки и оплаты.'}
      </Empty>
    );
    if (phone)
      return (
        <Page title="Сообщения" kind="cabinet" tab="Чаты" className="r6">
          <h1 className="h1">Сообщения</h1>
          <label className="search" style={{ maxWidth: 'none' }}><Icon name="search" /><input placeholder="Поиск по чатам" value={q} onChange={e => setQ(e.target.value)} aria-label="Поиск по чатам" /></label>
          {chats.length ? listEl : empty}
          <p className="small" style={{ textAlign: 'center', textWrap: 'balance' }}>{tutorView ? 'Один чат на каждого ученика: переписка, записи и оплаты — в одной ленте.' : 'Один чат на каждого репетитора: переписка, записи и оплаты — в одной ленте.'}</p>
        </Page>
      );
    return (
      <Page title="Сообщения" kind="cabinet" side="Сообщения">
        <div className="r6-msgr msgr">{listEl}<section className="r6-pane" style={{ display: 'grid', placeItems: 'center' }}>{empty}</section></div>
      </Page>
    );
  }

  /* ---------- chat ---------- */
  const p = partnerOf(d, current, me);
  const first = p.name.split(' ')[0];
  const allowed = chatApi.canWrite(d, me, current);
  const otherId = chatApi.chatPartnerId(current, me.id);
  const blocked = me.blocked.includes(otherId);
  const between = d.lessons.filter(l => l.studentId === current.studentId && l.tutorId === current.tutorId);
  const next = between.filter(l => rules.isUpcoming(l)).sort((a, b) => a.start - b.start)[0];
  const subjectLine = between[0]?.subject ?? d.requests.find(r => r.studentId === current.studentId && d.responses.some(x => x.requestId === r.id && x.tutorId === current.tutorId))?.title ?? p.tutor?.subjects[0]?.subject ?? '';
  const sub = next ? `${phone ? '' : `${subjectLine.replace(/ язык$/, '')} · `}урок ${fmtDayTime(next.start, me.tz)}` : subjectLine ? (phone ? subjectLine.replace(/ язык$/, '') : subjectLine) : '';
  const hasTalk = messages.some(m => m.kind === 'text' || m.kind === 'file' || m.kind === 'proposal');
  const send = (body: string) => !!run(() => chatApi.sendMessage(current.id, { text: body }));
  const sendFile = (f: { name: string; size: number; type: string; dataUrl?: string }) => run(() => chatApi.sendMessage(current.id, { file: f }));
  const t = p.tutor;
  const rating = t ? rv.tutorRating(d, t.userId) : null;
  const firstTop = !hasTalk && !tutorView && t && (
    <div style={{ display: 'grid', gap: 16, paddingTop: 8 }}>
      <div className="r6-mini">
        <Ava tone={t.tone} src={t.photo} />
        <b>{t.name}</b>
        <span className="small">{t.subjects.slice(0, 2).map(s => s.subject.replace(/ язык$/, '')).join(' / ')}{rating?.count ? <> · <Icon name="star" style={{ width: 14, height: 14, color: 'var(--accent)' }} />{rv.fmtRating(rating.avg)}</> : null}{t.prices[0] ? ` · от${NB}${fmtMoney(studentPrice(Math.min(...t.prices.map(x => x.price))))}` : ''}</span>
        <Btn size="s" to={`/teachers/${t.slug}`}>Анкета</Btn>
      </div>
      <p className="small" style={{ textAlign: 'center' }}>{nb(`Задайте вопрос до записи. ${first} обычно отвечает в течение дня.`)}</p>
      <div className="r6-sugg">{['Есть ли у вас опыт с моей задачей?', 'Можно знакомство в выходные?', 'Как проходят уроки?'].map(x => <button key={x} type="button" className="chip" onClick={() => send(x)}>{x}</button>)}</div>
    </div>
  );
  const thread = <Thread d={d} chat={current} messages={messages} me={me} top={firstTop || undefined} />;
  const proposeBtn = tutorView && allowed.ok && <Btn v="tinted" size="m" icon="cal" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => setPropose(true)}>{phone ? 'Время' : 'Предложить время'}</Btn>;
  const composer = allowed.ok
    ? <Composer glass={phone} value={text} setValue={setText} onSend={send} onFile={sendFile} extra={proposeBtn} />
    : <Note tone="action" icon={blocked ? 'lock' : 'chat'}><span>{allowed.reason}{blocked && <> <button type="button" className="btn-link" onClick={() => run(() => chatApi.setBlocked(otherId, false), `${first} разблокирован(а)`)}>Разблокировать</button></>}</span></Note>;
  const lastIn = [...messages].reverse().find(m => m.kind === 'text' && m.authorId === otherId);
  const menuEl = (
    <div className="filter">
      <button className="ibtn" type="button" data-dd-anchor aria-label="Ещё: пожаловаться или заблокировать" aria-expanded={menu} onClick={() => setMenu(v => !v)} style={phone ? undefined : { background: 'var(--fill)', boxShadow: 'none' }}><Icon name="dots" /></button>
      <Dropdown open={menu} onClose={() => setMenu(false)} align="right">
        <button type="button" onClick={() => { setMenu(false); setReport(true); }}>{`Пожаловаться на ${genitive(first)}`}</button>
        <button type="button" onClick={() => { setMenu(false); run(() => chatApi.setBlocked(otherId, !blocked), blocked ? `${first} разблокирован(а)` : `${first} заблокирован(а). Переписка сохранится`); }}>{blocked ? 'Разблокировать' : 'Заблокировать'}</button>
        {t && <button type="button" onClick={() => { setMenu(false); navigate(`/teachers/${t.slug}`); }}>Анкета</button>}
      </Dropdown>
    </div>
  );
  const reportSheet = (
    <Sheet open={report} onClose={() => setReport(false)} title={`Пожаловаться на ${genitive(first)}`}>
      {lastIn && <div className="msg msg--in" style={{ maxWidth: 'none', background: 'var(--bg)', boxShadow: 'none' }}>{nb(lastIn.text ?? '')}<time>{fmtDayTime(lastIn.createdAt, me.tz)}</time></div>}
      <div className="r6-li" role="radiogroup" aria-label="Причина">
        {REASONS.map(r => <label key={r} className="li"><input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} /><span className="t"><b>{r}</b></span><span className="mark"><Icon name="check" /></span></label>)}
      </div>
      <label className="between" style={{ padding: '2px 0', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
        <span><b style={{ display: 'block' }}>{`Заблокировать ${p.tutor ? genitive(first) : first}`}</b><span className="small">Не сможет вам писать, переписка сохранится</span></span>
        <Switch checked={block} onChange={setBlock} label="Заблокировать" />
      </label>
      <p className="small">{nb(`Поддержка проверит переписку в течение 24 часов. ${first} не узнает, кто пожаловался.`)}</p>
      <Btn v="primary" block onClick={() => { const ok = run(() => { chatApi.reportUser(current.id, lastIn?.id, reason, block); return true; }); if (ok) { setReport(false); toast('Жалоба отправлена, поддержка проверит переписку', { tone: 'ok' }); } }}>Отправить жалобу</Btn>
    </Sheet>
  );
  const proposeSheet = tutorView && <ProposeSheet open={propose} onClose={() => { setPropose(false); if (sp.get('propose')) setSp({}, { replace: true }); }} chat={current} me={me} studentFirst={first} />;
  const who = <div className="r6-who"><ChatAva p={p} /><div><b>{p.name}</b>{sub && <span>{nb(sub)}</span>}</div></div>;

  if (phone)
    return (
      <Page title={p.name} kind="bare" hideTabs className="r6">
        <div className="chat-phone" style={{ height: '100dvh', minHeight: 0 }}>
          <div className="appbar r6-ah"><IBtn icon="left" label="Назад" onClick={() => navigate('/messages')} />{who}{menuEl}</div>
          <div className="r6-body" style={{ background: '#fff' }}>{thread}</div>
          <div className="composer-bar">{composer}</div>
        </div>
        {reportSheet}{proposeSheet}
      </Page>
    );
  return (
    <Page title={p.name} kind="cabinet" side="Сообщения">
      <div className="r6-msgr msgr">
        {listEl}
        <section className="r6-pane">
          <div className="r6-head">{who}{t && <Btn size="s" to={`/teachers/${t.slug}`}>Анкета</Btn>}{menuEl}</div>
          <div className="r6-body">{thread}</div>
          <div className="r6-cbar">{composer}</div>
        </section>
      </div>
      {reportSheet}{proposeSheet}
    </Page>
  );
}

function ProposeSheet({ open, onClose, chat, me, studentFirst }: { open: boolean; onClose: () => void; chat: Chat; me: User; studentFirst: string }) {
  const d = useDb();
  const { run, toast } = useApp();
  const t = tutorById(d, me.id);
  const subjects = t ? [...new Set(t.prices.map(p => p.subject))] : [];
  const [subject, setSubject] = useState(subjects[0] ?? '');
  const mins = t ? t.prices.filter(p => p.subject === subject).map(p => p.minutes).sort((a, b) => a - b) : [];
  const [minutes, setMinutes] = useState(mins.includes(60) ? 60 : mins[0] ?? 60);
  const [slots, setSlots] = useState<number[]>([]);
  const free = useMemo(() => (t ? schedule.freeSlots(d, t, { minutes, ignoreHorizon: true, untilDays: 14 }) : []), [d, t, minutes]);
  if (!t) return null;
  const per = new Map<string, number>();
  const shown = free.filter(s => { const k = dateKey(s, me.tz); const c = per.get(k) ?? 0; per.set(k, c + 1); return c < 2; }).slice(0, 12);
  const price = t.prices.find(p => p.subject === subject && p.minutes === minutes)?.price ?? 0;
  const st = userById(d, chat.studentId);
  const toggle = (s: number) => setSlots(x => (x.includes(s) ? x.filter(y => y !== s) : x.length >= 4 ? x : [...x, s]));
  return (
    <Sheet open={open} onClose={onClose} title="Предложить время" wide>
      {subjects.length > 1 && <Options legend="Предмет" options={subjects} value={subject} onChange={v => { setSubject(v); setSlots([]); }} />}
      {mins.length > 1 && <Options legend="Длительность" options={mins.map(m => ({ value: String(m), label: `${m} мин` }))} value={String(minutes)} onChange={v => { setMinutes(Number(v)); setSlots([]); }} />}
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="between"><span className="label" style={{ padding: 0 }}>Окна, до 4</span><span className="small">{`выбрано ${slots.length}`}</span></div>
        {shown.length ? (
          <div className="r5-slots">{shown.map(s => { const z = zoned(s, me.tz); return <button key={s} type="button" className="slot r5-slot" aria-pressed={slots.includes(s)} onClick={() => toggle(s)}><small>{`${weekdayShort(z.weekday)}${NB}${z.day}`}</small>{fmtTime(s, me.tz)}</button>; })}</div>
        ) : <Note tone="action">Свободных окон на 2 недели нет. Откройте время в расписании.</Note>}
        <Tz>{`Время ваше, ${zoneCity(me.tz)} (${utcLabel(me.tz)})${st && st.tz !== me.tz && slots[0] ? `. У ${genitive(studentFirst)} первое окно в ${fmtTime(slots[0], st.tz)}` : ''}`}</Tz>
      </div>
      {price > 0 && <Note icon="card">{`${studentFirst} заплатит ${fmtMoney(studentPrice(price))}, вы получите ${fmtMoney(price)}.`}</Note>}
      <Btn v="primary" block disabled={!slots.length} onClick={() => { const ok = run(() => { chatApi.proposeTime(chat.id, slots, subject, minutes); return true; }); if (ok) { onClose(); setSlots([]); toast(`${studentFirst} получит предложение и запишется в один клик`, { tone: 'ok' }); } }}>{slots.length ? `Отправить ${slots.length === 1 ? 'окно' : `${slots.length} окна`}` : 'Выберите окна'}</Btn>
    </Sheet>
  );
}
