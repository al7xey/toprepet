import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { Conversation, Message, Role } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { Bubble, Button, Checkbox, FormError, Modal, Note, OptionChips, PageHeader, QueryView, TextArea, useToast } from '../../ui';

const REASONS = ['Спам или реклама', 'Просит общаться вне сервиса', 'Грубость или оскорбления', 'Другое'];
const POLL_MS = 10_000;

/** Диалог: сообщения, поле ввода, жалоба. Новые сообщения подтягиваются раз в 10 секунд. */
export function ChatView({ role }: { role: Extract<Role, 'student' | 'tutor'> }) {
  const { id = '' } = useParams();
  const conversation = useQuery(`chat-${id}`, () => api.getConversation(id));
  const messages = useQuery(`messages-${id}`, () => api.listMessages(id));
  const base = role === 'tutor' ? '/tutor/chats' : '/me/chats';
  const reload = messages.reload;
  useEffect(() => {
    const timer = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);
  return (
    <AppLayout role={role} narrow>
      <QueryView query={conversation} empty={() => null}>
        {(c) => (
          <>
            <PageHeader title={c.peerName} back={{ to: base, label: 'Сообщения' }} actions={<ReportButton conversation={c} onBlocked={() => conversation.reload()} />}
              lead={role === 'student' ? undefined : 'Ученик'} />
            <QueryView query={messages} loading={<span className="muted">Загружаем сообщения…</span>}>
              {(list) => <Thread conversation={c} list={list} onSent={(m) => messages.setData((prev) => [...(prev ?? []), m])} />}
            </QueryView>
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}

function Thread({ conversation, list, onSent }: { conversation: Conversation; list: Message[]; onSent: (m: Message) => void }) {
  const { user } = useSession();
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const send = useMutation((value: string) => api.sendMessage(conversation.id, value));
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [list.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    const sent = await send.run(value);
    if (sent) { setText(''); onSent(sent); }
  };
  return (
    <>
      <div className="trk-thread" aria-live="polite">
        {list.length === 0 && <p className="muted">Напишите первое сообщение: представьтесь и расскажите, чем нужна помощь.</p>}
        {list.map((m) => <Bubble key={m.id} mine={m.authorId === user?.id} system={m.kind === 'event'} text={m.text} at={m.at} />)}
        <div ref={end} />
      </div>
      {conversation.blocked ? <Note tone="bad">Диалог заблокирован: писать в него нельзя.</Note> : (
        <form className="trk-compose" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <TextArea label="Сообщение" rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void submit(); } }} hint="Телефоны, ссылки и мессенджеры писать нельзя: общайтесь и платите внутри TopRepet. Ctrl+Enter — отправить." />
          <FormError error={send.error} />
          <div className="trk-actions"><Button type="submit" icon="send" loading={send.pending} disabled={!text.trim()}>Отправить</Button></div>
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
      <Button variant="fill" size="s" icon="flag" onClick={() => setOpen(true)}>Пожаловаться</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Пожаловаться на диалог" footer={<><Button variant="fill" onClick={() => setOpen(false)}>Отмена</Button><Button variant="danger" onClick={submit} disabled={!reason} loading={report.pending}>Отправить жалобу</Button></>}>
        <OptionChips options={REASONS} value={reason} onChange={setReason} label="Что не так" />
        <Checkbox checked={block} onChange={setBlock}>Заблокировать диалог</Checkbox>
        <FormError error={report.error} />
      </Modal>
    </>
  );
}

export default function StudentChatPage() {
  return <ChatView role="student" />;
}
