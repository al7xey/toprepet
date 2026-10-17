import { Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, EmptyState, ErrorState } from '../../ui';

/** Открывает диалог с репетитором из анкеты или отклика (создаёт, если его ещё нет). */
export default function NewChatPage() {
  const [params] = useSearchParams();
  const tutor = params.get('tutor') ?? '';
  const chat = useQuery(tutor ? `open-chat-${tutor}` : null, () => api.openConversation(tutor));
  if (chat.data) return <Navigate to={`/me/chats/${chat.data.id}`} replace />;
  return (
    <AppLayout role="student" narrow>
      {!tutor ? <EmptyState icon="chat" title="Не выбран репетитор" text="Откройте анкету репетитора и нажмите «Написать»." actions={<Button to="/teachers">Найти репетитора</Button>} />
        : chat.error ? <ErrorState text={chat.error} onRetry={chat.reload} />
          : <EmptyState icon="clock" title="Открываем диалог…" />}
    </AppLayout>
  );
}
