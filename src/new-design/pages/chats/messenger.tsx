import { usePolling } from '../../lib/usePolling';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { Conversation, Message, Role } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { timeLabel } from '../../lib/format';
import { Avatar, BackLink, Button, Checkbox, ConfirmDialog, EmptyState, FormError, Icon, IconButton, Modal, OptionChips, Rows, useToast, UnreadDot } from '../../ui';

type Side = Extract<Role, 'student' | 'tutor'>;

const REASONS = ['Спам или реклама', 'Просит общаться вне сервиса', 'Грубость или оскорбления', 'Другое'];
const LIST_POLL_MS = 10_000;
const THREAD_POLL_MS = 5_000;

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Сообщения как в мессенджере: слева список диалогов, справа переписка. На телефоне — два экрана с кнопкой «назад». */
export function Messenger({ role }: { role: Side }) {
  const { id } = useParams();
  const base = role === 'tutor' ? '/tutor/chats' : '/me/chats';
  const chats = useQuery('chats', () => api.listConversations());
  const reloadChats = chats.reload;
  usePolling(reloadChats, LIST_POLL_MS);
  const list = chats.data ?? [];
  return (
    <AppLayout role={role} chat={id ? 'thread' : 'list'}>
      <div className={`tg${id ? ' open' : ''}`}>
        <aside className="tg-list" aria-label="Диалоги">
          <h1 className="tg-title">Сообщения</h1>
          {chats.error && <FormError error={chats.error} />}
          {chats.loading && !chats.data && <p className="muted tg-pad">Загружаем…</p>}
          {chats.data && list.length === 0 && (
            <div className="tg-pad">
              <EmptyState icon="chat" title="Сообщений пока нет"
                text={role === 'student' ? 'Напишите репетитору из его анкеты.' : 'Ученик пишет первым: когда это случится, диалог появится здесь.'}
                actions={role === 'student' ? <Button to="/teachers">Найти репетитора</Button> : undefined} />
            </div>
          )}
          <nav className="tg-rows">
            {list.map((c) => (
              <NavLink key={c.id} to={`${base}/${c.id}`} className={({ isActive }) => `tg-row${isActive ? ' on' : ''}`}>
                <Avatar name={c.peerName} photo={c.peerPhoto} size={52} />
                <span className="tg-row-text">
                  <b>{c.peerName}</b>
                  <span>{c.lastMessage || 'Диалог пока пуст'}</span>
                </span>
                {c.unread > 0 && <UnreadDot label="Непрочитано" />}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="tg-main">
          {id ? <Dialog key={id} id={id} role={role} base={base} onRead={reloadChats} /> : (
            <div className="tg-placeholder"><Icon name="chat" /><span>Выберите диалог слева</span></div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function Dialog({ id, role, base, onRead }: { id: string; role: Side; base: string; onRead: () => void }) {
  const conversation = useQuery(`chat-${id}`, () => api.getConversation(id));
  const messages = useQuery(`messages-${id}`, () => api.listMessages(id));
  const [older, setOlder] = useState<Message[]>([]);
  const [hasOlder, setHasOlder] = useState(true);
  const previous = useRef<Message[]>([]);
  const reload = messages.reload;
  usePolling(reload, THREAD_POLL_MS);
  const mark = useMutation((throughMessageId: string) => api.markConversationRead(id, throughMessageId));
  const markRead = mark.run;
  const lastId = messages.data?.at(-1)?.id;
  useEffect(() => { if (lastId) void markRead(lastId).then(onRead); }, [lastId, markRead, onRead]);
  useEffect(() => {
    const current = messages.data;
    if (!current?.length) return;
    if (current.length === 100 && previous.current.length < 100) setHasOlder(true);
    const ids = new Set(current.map((m) => m.id));
    if (current.length < 100 || (previous.current.length && !previous.current.some((m) => ids.has(m.id)))) {
      setOlder([]);
      setHasOlder(current.length === 100);
    } else {
      const first = current[0];
      const archived = previous.current.filter((m) => m.at < first.at || (m.at === first.at && m.id < first.id));
      if (archived.length) setOlder((prev) => [...new Map([...prev, ...archived].map((m) => [m.id, m])).values()]);
    }
    previous.current = current;
  }, [messages.data]);
  const history = useMutation(async () => {
    const first = older[0] ?? messages.data?.[0];
    if (!first) return;
    const page = await api.listMessages(id, { before: first.id });
    setOlder((prev) => [...page, ...prev]);
    setHasOlder(page.length === 100);
  });
  const list = [...new Map([...older, ...(messages.data ?? [])].map((m) => [m.id, m])).values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const c = conversation.data;
  if (conversation.error && !c) return <div className="tg-placeholder"><span>{conversation.error}</span></div>;
  if (!c) return <div className="tg-placeholder"><span className="muted">Открываем диалог…</span></div>;
  return (
    <>
      <header className="tg-head">
        <BackLink to={base} className="tg-back">Назад к списку</BackLink>
        {role === 'student' ? (
          <Link className="tg-peer" to={`/teachers/${c.tutorId}`} state={{ back: `${base}/${c.id}` }} aria-label={`Анкета: ${c.peerName}`}>
            <Avatar name={c.peerName} photo={c.peerPhoto} size={44} />
            <span className="tg-head-text"><b>{c.peerName}</b><small>Репетитор</small></span>
          </Link>
        ) : (
          <span className="tg-peer">
            <Avatar name={c.peerName} photo={c.peerPhoto} size={44} />
            <span className="tg-head-text"><b>{c.peerName}</b><small>Ученик</small></span>
          </span>
        )}
        <ReportButton conversation={c} onBlocked={() => conversation.reload()} />
      </header>
      {(messages.error || history.error || mark.error) && <FormError error={messages.error ?? history.error ?? mark.error} />}
      <Thread conversation={c} list={list} older={hasOlder && Boolean(older.length || messages.data?.length === 100)} loadingOlder={history.pending} loadOlder={history.run} loading={messages.loading && !messages.data} onSent={(m) => { messages.setData((prev) => [...(prev ?? []), m]); onRead(); }} onRemoved={(removed) => { setOlder((prev) => prev.filter((m) => m.id !== removed)); messages.setData((prev) => (prev ?? []).filter((m) => m.id !== removed)); }} />
    </>
  );
}

function Thread({ conversation, list, loading, onSent, onRemoved, older, loadingOlder, loadOlder }: { conversation: Conversation; list: Message[]; loading: boolean; older: boolean; loadingOlder: boolean; loadOlder: () => Promise<unknown>; onSent: (m: Message) => void; onRemoved: (id: string) => void }) {
  const { user } = useSession();
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const send = useMutation((value: string) => api.sendMessage(conversation.id, value));
  const [removing, setRemoving] = useState<Message | null>(null);
  const remove = useMutation(async (m: Message) => { await api.deleteMessage(conversation.id, m.id); return true; });
  // долгое нажатие на своё сообщение (или правая кнопка мыши) предлагает удалить его, как в Telegram и WhatsApp
  const hold = useRef<number | null>(null);
  const stopHold = () => { if (hold.current !== null) { window.clearTimeout(hold.current); hold.current = null; } };
  const holdProps = (m: Message) => ({
    onPointerDown: () => { stopHold(); hold.current = window.setTimeout(() => { hold.current = null; remove.reset(); setRemoving(m); }, 450); },
    onPointerUp: stopHold, onPointerLeave: stopHold, onPointerCancel: stopHold, onPointerMove: stopHold,
    onContextMenu: (e: { preventDefault: () => void }) => { e.preventDefault(); stopHold(); remove.reset(); setRemoving(m); },
  });
  const confirmRemove = async () => {
    if (removing && await remove.run(removing)) { onRemoved(removing.id); setRemoving(null); }
  };
  const fileInput = useRef<HTMLInputElement>(null);
  // фото сжимаем в браузере до отправки: не больше 1600 px по длинной стороне и около 0,8 МБ
  const sendPhoto = useMutation(async (file: File) => {
    return api.sendPhoto(conversation.id, file, text.trim() || undefined);
  });

  const preservingScroll = useRef(false);
  const previousPage = async () => {
    const node = scroller.current;
    if (!node) return;
    const top = node.scrollTop; const height = node.scrollHeight;
    preservingScroll.current = true;
    await loadOlder();
    requestAnimationFrame(() => { node.scrollTop = top + node.scrollHeight - height; preservingScroll.current = false; });
  };
  useLayoutEffect(() => {
    if (preservingScroll.current) return;
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [list.length]);

  const grow = () => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  };
  useLayoutEffect(grow, [text]);

  const submit = async () => {
    const value = text.trim();
    if (!value || send.pending) return;
    const sent = await send.run(value);
    if (sent) { setText(''); onSent(sent); input.current?.focus(); }
  };
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const sent = await sendPhoto.run(file);
    if (sent) { setText(''); onSent(sent); }
    if (fileInput.current) fileInput.current.value = '';
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter отправляет, Shift+Enter — новая строка (как в Telegram)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
  };

  return (
    <>
      <div className="tg-thread" ref={scroller} aria-live="polite">
        {older && <Button variant="line" size="s" loading={loadingOlder} onClick={() => void previousPage()}>Предыдущие сообщения</Button>}
        {loading && <p className="muted tg-note">Загружаем сообщения…</p>}
        {!loading && list.length === 0 && <p className="tg-note">Напишите первое сообщение: представьтесь и расскажите, чем нужна помощь.</p>}
        {list.map((m, i) => {
          const prev = list[i - 1];
          const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
          const mine = m.authorId === user?.id;
          const joined = !newDay && m.kind !== 'event' && prev?.kind !== 'event' && prev?.authorId === m.authorId;
          return (
            <div key={m.id} className="tg-fragment">
              {newDay && <div className="tg-day"><span>{dayLabel(m.at)}</span></div>}
              {m.kind === 'event'
                ? <div className="tg-sys">{m.text}</div>
                : (
                  <div className={`tg-msg ${mine ? 'out' : 'in'}${joined ? ' joined' : ''}`} {...(mine ? holdProps(m) : {})}>
                    {m.imageUrl && <img className="tg-photo" src={m.imageUrl} crossOrigin="use-credentials" alt="Фото в сообщении" loading="lazy" />}
                    {m.card ? (
                      <div className="tg-card">
                        <b>{m.card.title}</b>
                        <Rows boxed rows={m.card.rows.map(([k, v]) => (k === 'Сообщение' || v.includes('\n') ? [k, v, 'block'] as [string, string, 'block'] : [k, v] as [string, string]))} />
                      </div>
                    ) : m.text && <span className="tg-text">{m.text}</span>}
                    {mine && <IconButton icon="more" label="Удалить своё сообщение" className="tg-message-actions" onClick={() => { stopHold(); remove.reset(); setRemoving(m); }} />}
                    <small>{timeLabel(m.at)}{mine && <Icon name={m.read ? 'ticks' : 'tick'} />}</small>
                  </div>
                )}
            </div>
          );
        })}
      </div>
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={() => void confirmRemove()} title="Удалить сообщение?" text="Оно исчезнет у вас и у собеседника." confirmLabel="Удалить" variant="danger" pending={remove.pending} error={remove.error} />
      {conversation.blocked ? <p className="tg-blocked">Диалог заблокирован: писать в него нельзя.</p> : (
        <form className="tg-compose" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          {(send.error || sendPhoto.error) && <FormError error={send.error ?? sendPhoto.error} />}
          <div className="tg-compose-row">
            <input ref={fileInput} type="file" accept="image/*" className="trk-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <IconButton className="tg-attach" icon="attach" label="Прикрепить фото" disabled={sendPhoto.pending} onClick={() => fileInput.current?.click()} />
            <textarea ref={input} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
              aria-label="Сообщение" placeholder="Сообщение" className="tg-input" />
            <IconButton type="submit" className="tg-send" icon="arrow-up" label="Отправить" disabled={!text.trim() || send.pending} />
          </div>
        </form>
      )}
    </>
  );
}

function ReportButton({ conversation, onBlocked }: { conversation: Conversation; onBlocked: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [block, setBlock] = useState(true);
  const report = useMutation(async (input: { reason: string; block: boolean }) => { await api.reportConversation(conversation.id, input.reason, input.block); return true; });
  const submit = async () => {
    if (!reason) return;
    if (await report.run({ reason, block })) { setOpen(false); toast('Жалоба отправлена'); if (block) onBlocked(); }
  };
  return (
    <>
      <IconButton icon="flag" label="Пожаловаться" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Пожаловаться на диалог" footer={<><Button variant="fill" onClick={() => setOpen(false)}>Отмена</Button><Button variant="danger" onClick={submit} disabled={!reason} loading={report.pending}>Отправить жалобу</Button></>}>
        <OptionChips options={REASONS} value={reason} onChange={setReason} label="Что не так" />
        <Checkbox checked={block} onChange={setBlock}>Заблокировать диалог</Checkbox>
        <FormError error={report.error} />
      </Modal>
    </>
  );
}
