import type { Role } from '../../api/types';
import { Messenger } from './messenger';

/** Список диалогов: слева в мессенджере, на телефоне — отдельный экран. */
export function ChatsList({ role }: { role: Extract<Role, 'student' | 'tutor'> }) {
  return <Messenger role={role} />;
}

export default function StudentChatsPage() {
  return <ChatsList role="student" />;
}
