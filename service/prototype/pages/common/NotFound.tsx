import { Page } from '../../ui/layout';
import { Btn, Empty } from '../../ui/kit';
import { useSession } from '../../api';

export default function NotFound() {
  const me = useSession();
  const home = me?.role === 'tutor' ? '/tutor/lessons' : me?.role === 'admin' ? '/admin/disputes' : '/';
  return (
    <Page title="Страница не найдена">
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <Empty icon="search" title="Такой страницы нет" action={<div className="row-s" style={{ justifyContent: 'center' }}><Btn v="primary" to={home}>На главную</Btn>{me?.role !== 'tutor' && <Btn to="/teachers">Репетиторы</Btn>}</div>}>
          Возможно, ссылка устарела или в адресе опечатка.
        </Empty>
      </div>
    </Page>
  );
}
