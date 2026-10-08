import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Btn, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { renderTokens } from '../../ui/domain';
import { useApp } from '../../ui/app-state';
import { schedule, tutorById, userById } from '../../api';
import type { Chat, Db, Message, User } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';
import { fileExt, findContacts, fmtFileSize, nb } from '../../lib/text';
import { DAY, NB, dateKey, fmtDay, fmtTime, mskDiffLabel, now, startOfDay, utcLabel, weekdayShort, zoneCity, zoned } from '../../lib/time';
import { checkoutUrl } from '../booking/Pick';

export const FILE_LIMIT = 20 * 1024 * 1024;

export const isMine = (m: Message, me: User) => (me.role === 'admin' ? m.authorId === 'support' : m.authorId === me.id);

/* event text as this viewer should read it: tutors get their own wording */
export function eventFor(m: Message, viewerIsTutor: boolean) {
  const ev = m.event!;
  if (!viewerIsTutor || !ev.tutor) return { icon: ev.icon, text: ev.text, sub: ev.sub, action: ev.action };
  return {
    icon: ev.icon,
    text: ev.tutor.text ?? ev.text,
    sub: 'sub' in ev.tutor ? ev.tutor.sub : ev.sub,
    action: 'action' in ev.tutor ? ev.tutor.action ?? undefined : ev.action,
  };
}

/* one line preview for the chat list */
export function preview(m: Message | undefined, me: User, viewerIsTutor: boolean) {
  if (!m) return 'Новый чат';
  const mine = isMine(m, me) ? 'Вы: ' : '';
  if (m.kind === 'event') return renderTokens(eventFor(m, viewerIsTutor).text, me.tz);
  if (m.kind === 'file') return `${mine}${m.file?.name ?? 'Файл'}`;
  if (m.kind === 'proposal') return `${mine}Предложение времени`;
  return `${mine}${m.text ?? ''}`;
}

function dayLabel(ts: number, tz: string) {
  const today = startOfDay(now(), tz);
  if (ts >= today) return 'Сегодня';
  if (ts >= today - DAY) return 'Вчера';
  return fmtDay(ts, tz);
}

function Ticks({ read }: { read: boolean }) {
  return <span className={cx('r6-tk', read && 'rd')} aria-label={read ? 'прочитано' : 'доставлено'}><Icon name="check" />{read && <Icon name="check" />}</span>;
}

/* masked contacts are highlighted so the author sees what was hidden */
function TextWithMask({ text }: { text: string }) {
  const parts = text.split(/(\[контакт скрыт\])/);
  return <>{parts.map((p, i) => (p === '[контакт скрыт]' ? <span key={i} className="r6-hl">контакт скрыт</span> : <span key={i}>{nb(p)}</span>))}</>;
}

export function Thread({ d, chat, messages, me, top }: { d: Db; chat: Chat; messages: Message[]; me: User; top?: ReactNode }) {
  const navigate = useNavigate();
  const viewerIsTutor = chat.kind === 'pair' && chat.tutorId === me.id;
  const tz = me.tz;
  const out: ReactNode[] = [];
  let lastDay = '';
  for (const m of messages) {
    const k = dateKey(m.createdAt, tz);
    if (k !== lastDay) {
      out.push(<div key={`d${k}`} className="msg msg--sys">{dayLabel(m.createdAt, tz)}</div>);
      lastDay = k;
    }
    const mine = isMine(m, me);
    const time = <time>{fmtTime(m.createdAt, tz)}{mine && m.authorId !== 'system' && <Ticks read={!!m.readAt} />}</time>;
    if (m.kind === 'event' && m.event) {
      const ev = eventFor(m, viewerIsTutor);
      out.push(
        <div key={m.id} className="r6-ev">
          <Icon name={ev.icon} />
          <span>{renderTokens(ev.text, tz)}{ev.sub && <small>{renderTokens(ev.sub, tz)}</small>}</span>
          {ev.action && <Btn size="s" v={ev.action.tone === 'tinted' ? 'tinted' : 'gray'} to={ev.action.to}>{ev.action.label}</Btn>}
        </div>,
      );
    } else if (m.kind === 'file' && m.file) {
      const img = m.file.dataUrl && m.file.type.startsWith('image/');
      out.push(
        <div key={m.id} className={cx('msg', mine ? 'msg--out' : 'msg--in')}>
          {img ? <a href={m.file.dataUrl} target="_blank" rel="noreferrer"><img className="msg-img" src={m.file.dataUrl} alt={m.file.name} /></a> : (
            <div className="r6-file">
              <i><Icon name={m.file.type.startsWith('image/') ? 'image' : 'doc'} /></i>
              <div>{m.file.dataUrl ? <a href={m.file.dataUrl} download={m.file.name}><b>{m.file.name}</b></a> : <b>{m.file.name}</b>}<span>{`${fmtFileSize(m.file.size)} · ${fileExt(m.file.name)}`}</span></div>
            </div>
          )}
          {m.text && <div style={{ marginTop: 6 }}><TextWithMask text={m.text} /></div>}
          {time}
        </div>,
      );
    } else if (m.kind === 'proposal' && m.proposal) {
      const p = m.proposal;
      const t = tutorById(d, chat.tutorId);
      const st = userById(d, chat.studentId);
      const stTz = st?.tz ?? 'Europe/Moscow';
      const stName = st?.name.split(' ')[0] ?? 'Ученик';
      const free = (s: number) => !!t && s > now() && schedule.slotAvailable(d, t, s, { minutes: p.minutes, ignoreHorizon: true, ignoreNotice: true, forStudentId: chat.studentId });
      out.push(
        <div key={m.id} className="r6-prop" style={mine ? undefined : { justifySelf: 'start', borderBottomRightRadius: 22, borderBottomLeftRadius: 8 }}>
          <b>{mine ? 'Предлагаю время' : `${t?.name.split(' ')[0] ?? 'Репетитор'} предлагает время`}</b>
          <div className="slots">
            {p.slots.map(s => {
              const ok = free(s) && p.usedSlot !== s;
              const z = zoned(s, tz);
              return <button key={s} type="button" className="slot" disabled={!ok || viewerIsTutor} aria-pressed={p.usedSlot === s ? true : undefined} onClick={() => t && navigate(checkoutUrl(t.slug, s, p.minutes, p.subject, 'self'))}><small>{`${weekdayShort(z.weekday)}${NB}${z.day}`}</small>{fmtTime(s, tz)}</button>;
            })}
          </div>
          <p>{nb(viewerIsTutor
            ? `${p.subject}, ${p.minutes} мин. Время ваше (${utcLabel(tz)})${stTz !== tz ? `, ${stName} увидит ${[...new Set(p.slots.map(s => fmtTime(s, stTz)))].join(' и ')} ${stTz === 'Europe/Moscow' ? 'по Москве' : `(${mskDiffLabel(stTz)})`}` : ''}. ${stName} заплатит ${fmtMoney(studentPrice(p.tutorPrice))}, вы получите ${fmtMoney(p.tutorPrice)}.`
            : `${p.subject}, ${p.minutes} мин, ${fmtMoney(studentPrice(p.tutorPrice))}. Время ваше, ${zoneCity(tz)}. Нажмите на окно — запишетесь в один клик.`)}</p>
          {time}
        </div>,
      );
    } else {
      out.push(<div key={m.id} className={cx('msg', m.authorId === 'system' ? 'msg--sys' : mine ? 'msg--out' : 'msg--in')}>{m.text && <TextWithMask text={m.text} />}{m.authorId !== 'system' && time}</div>);
    }
  }
  return <div className="thread r6-th">{top}{out}</div>;
}

/* ---------- composer ---------- */
export function readFile(file: File): Promise<{ name: string; size: number; type: string; dataUrl?: string }> {
  return new Promise(resolve => {
    const base = { name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
    if (file.size > 700 * 1024) return resolve(base);
    const r = new FileReader();
    r.onload = () => resolve({ ...base, dataUrl: String(r.result) });
    r.onerror = () => resolve(base);
    r.readAsDataURL(file);
  });
}

const contactKind = (text: string) => (/(?:\+7|8)[\s\-()]*\d{3}/.test(text) ? 'Номер телефона будет скрыт' : /@[\w-]+\./.test(text) ? 'Почта будет скрыта' : 'Контакт будет скрыт');
const stripContacts = (text: string) => text
  .replace(/(?:\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/g, '')
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
  .replace(/(?:t\.me|wa\.me|vk\.com|telegram\.me|instagram\.com)\/[\w./-]+/gi, '')
  .replace(/(?:^|\s)@[a-z0-9_]{4,}/gi, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

export function Composer({ onSend, onFile, extra, glass, warnContacts = true, placeholder = 'Сообщение…', value, setValue }: {
  onSend: (text: string) => boolean | void; onFile: (f: { name: string; size: number; type: string; dataUrl?: string }) => void; extra?: ReactNode; glass?: boolean; warnContacts?: boolean; placeholder?: string; value: string; setValue: (v: string) => void;
}) {
  const { toast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasContact = warnContacts && findContacts(value);
  const submit = (e?: FormEvent, text = value) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const ok = onSend(text);
    if (ok !== false) setValue('');
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > FILE_LIMIT) return toast('Файл больше 20 МБ. Сожмите его или отправьте ссылкой', { tone: 'bad' });
    setBusy(true);
    onFile(await readFile(f));
    setBusy(false);
  };
  return (
    <>
      {hasContact && (
        <Alert tone="action" icon="shield" title={contactKind(value)} style={{ maxWidth: 'none', width: '100%' }} action={<Btn v="white" size="s" onClick={() => submit(undefined, stripContacts(value))}>Отправить без контакта</Btn>}>
          {`Контакты в чате всегда скрываются. В${NB}TopRepet у вас остаются возврат денег за отменённые уроки, защита в споре и история занятий.`}
        </Alert>
      )}
      <form className={cx('composer', glass ? 'glass r6-pc' : 'r6-cmp')} onSubmit={submit}>
        <button className="btn btn--gray btn--circle btn--m" type="button" aria-label="Прикрепить фото или файл до 20 МБ" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="plus" /></button>
        <input ref={fileRef} className="file-input" type="file" tabIndex={-1} onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        {extra}
        <label className="sr" htmlFor="composer-input">Сообщение</label>
        <input id="composer-input" placeholder={placeholder} value={value} maxLength={4000} autoComplete="off" onChange={e => setValue(e.target.value)} />
        <button className="btn btn--primary btn--circle btn--m" type="submit" aria-label="Отправить" disabled={!value.trim()}><Icon name="send" /></button>
      </form>
    </>
  );
}
