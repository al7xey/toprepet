import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { Conversation, Message, Role } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago, timeLabel } from '../../lib/format';
import { Avatar, Button, Checkbox, EmptyState, FormError, Icon, IconButton, Modal, OptionChips, useToast } from '../../ui';

type Side = Extract<Role, 'student' | 'tutor'>;

const REASONS = ['Спам или реклама', 'Просит общаться вне сервиса', 'Грубость или оскорбления', 'Другое'];
const LIST_POLL_MS = 10_000;
const THREAD_POLL_MS = 5_000;

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Сообщения как в мессенджере: слева список диалогов, справа переписка. На телефоне — два экрана с кнопкой «назад». */
export function Messenger({ role }: { role: Side }) {
  const { id } = useParams();
  const base = role === 'tutor' ? '/tutor/chats' : '/me/chats';
  const chats = useQuery('chats', () => api.listConversations());
  const reloadChats = chats.reload;
  useEffect(() => {
    const timer = window.setInterval(reloadChats, LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reloadChats]);
  const list = chats.data ?? [];
  return (
    <AppLayout role={role} chat={id ? 'thread' : 'list'}>
      <div className={`tg${id ? ' open' : ''}`}>
        <aside className="tg-list" aria-label="Диалоги">
          <h1 className="tg-title">Сообщения</h1>
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
                <span className="tg-row-meta">
                  <small>{ago(c.updatedAt)}</small>
                  {c.unread > 0 && <span className="tg-unread">{c.unread}</span>}
                </span>
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
  const reload = messages.reload;
  useEffect(() => {
    const timer = window.setInterval(reload, THREAD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);
  useEffect(() => { if (messages.data) onRead(); }, [messages.data?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = conversation.data;
  if (conversation.error && !c) return <div className="tg-placeholder"><span>{conversation.error}</span></div>;
  if (!c) return <div className="tg-placeholder"><span className="muted">Открываем диалог…</span></div>;
  return (
    <>
      <header className="tg-head">
        <Link to={base} className="tg-back" aria-label="Назад к списку"><Icon name="back" /></Link>
        {role === 'student' ? (
          <Link className="tg-peer" to={`/teachers/${c.tutorId}`} state={{ back: `${base}/${c.id}` }} aria-label={`Анкета: ${c.peerName}`}>
            <Avatar name={c.peerName} photo={c.peerPhoto} size={44} />
            <span className="tg-head-text"><b>{c.peerName}</b><small>Репетитор, открыть анкету</small></span>
          </Link>
        ) : (
          <span className="tg-peer">
            <Avatar name={c.peerName} photo={c.peerPhoto} size={44} />
            <span className="tg-head-text"><b>{c.peerName}</b><small>Ученик</small></span>
          </span>
        )}
        <ReportButton conversation={c} onBlocked={() => conversation.reload()} />
      </header>
      <Thread conversation={c} list={messages.data ?? []} loading={messages.loading && !messages.data} onSent={(m) => { messages.setData((prev) => [...(prev ?? []), m]); onRead(); }} />
    </>
  );
}

function Thread({ conversation, list, loading, onSent }: { conversation: Conversation; list: Message[]; loading: boolean; onSent: (m: Message) => void }) {
  const { user } = useSession();
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const send = useMutation((value: string) => api.sendMessage(conversation.id, value));
  const fileInput = useRef<HTMLInputElement>(null);
  // фото сжимаем в браузере до отправки: не больше 1600 px по длинной стороне и около 0,8 МБ
  const sendPhoto = useMutation(async (file: File) => {
    const { default: compress } = await import('browser-image-compression');
    const small = await compress(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true });
    return api.sendPhoto(conversation.id, new File([small], file.name, { type: small.type || file.type }), text.trim() || undefined);
  });

  useLayoutEffect(() => {
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
                  <div className={`tg-msg ${mine ? 'out' : 'in'}${joined ? ' joined' : ''}`}>
                    {m.imageUrl && <img className="tg-photo" src={m.imageUrl} alt="Фото в сообщении" loading="lazy" />}
                    {m.text && <span className="tg-text">{m.text}</span>}
                    <small>{timeLabel(m.at)}{mine && <Icon name={m.read ? 'checks' : 'check'} />}</small>
                  </div>
                )}
            </div>
          );
        })}
      </div>
      {conversation.blocked ? <p className="tg-blocked">Диалог заблокирован: писать в него нельзя.</p> : (
        <form className="tg-compose" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          {(send.error || sendPhoto.error) && <FormError error={send.error ?? sendPhoto.error} />}
          <div className="tg-compose-row">
            <input ref={fileInput} type="file" accept="image/*" className="trk-sr" tabIndex={-1} aria-hidden="true" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <button type="button" className="tg-attach" aria-label="Прикрепить фото" disabled={sendPhoto.pending} onClick={() => fileInput.current?.click()}><Icon name="attach" /></button>
            <textarea ref={input} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
              aria-label="Сообщение" placeholder="Сообщение" className="tg-input" />
            <button type="submit" className="tg-send" aria-label="Отправить" disabled={!text.trim() || send.pending}><Icon name="arrow-up" /></button>
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
