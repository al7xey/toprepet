import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import type { Role } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago } from '../../lib/format';
import { Button, EmptyState, LoadingList, PageHeader, Person, QueryView } from '../../ui';

/** Список диалогов. Для ученика и репетитора один и тот же экран. */
export function ChatsList({ role }: { role: Extract<Role, 'student' | 'tutor'> }) {
  const chats = useQuery('chats', () => api.listConversations());
  const base = role === 'tutor' ? '/tutor/chats' : '/me/chats';
  return (
    <AppLayout role={role} narrow>
      <PageHeader title="Сообщения" />
      <QueryView
        query={chats}
        loading={<LoadingList rows={4} height={88} />}
        empty={(list) => (list.length ? null : (role === 'student'
          ? <EmptyState icon="chat" title="Сообщений пока нет" text="Напишите репетитору из его анкеты. Первым писать может только ученик." actions={<Button to="/teachers" size="lg">Найти репетитора</Button>} />
          : <EmptyState icon="chat" title="Сообщений пока нет" text="Ученик пишет первым: когда это случится, диалог появится здесь." />))}
      >
        {(list) => (
          <div className="trk-list">
            {list.map((c) => (
              <Link key={c.id} to={`${base}/${c.id}`} className="card trk-card trk-chatrow">
                <Person name={c.peerName} photo={c.peerPhoto} sub={c.lastMessage || 'Диалог пока пуст'} right={<span className="trk-right muted sm">{ago(c.updatedAt)}{c.unread > 0 && <span className="dot trk-unread">{c.unread}</span>}</span>} />
              </Link>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}

export default function StudentChatsPage() {
  return <ChatsList role="student" />;
}
