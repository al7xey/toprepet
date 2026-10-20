import { useNavigate } from 'react-router-dom';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { Avatar, Card, PageHeader } from '../../ui';

/** Профиль администратора: кто вошёл и кнопка выхода (на телефоне шапки нет, поэтому выход здесь). */
export default function AdminAccountPage() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  return (
    <AppLayout role="admin">
      <PageHeader title="Профиль" />
      <Card pad="sm">
        <div className="trk-account-hero">
          <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={56} />
          <div className="trk-account-who">
            <h2 className="trk-account-name">{user?.name}</h2>
            <span className="muted">{user?.email}</span>
            <span className="muted sm">Администратор</span>
          </div>
        </div>
      </Card>
      <button type="button" className="trk-logout" onClick={() => { void logout().then(() => navigate('/')); }}>Выйти</button>
    </AppLayout>
  );
}
