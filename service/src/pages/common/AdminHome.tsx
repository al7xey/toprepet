import { usePageMeta } from '../../ui/meta';

/* Placeholder: the admin area (registry, problems, users) is iteration 5. */
export function AdminHome() {
  usePageMeta('Админка', { noindex: true });
  return (
    <>
      <h1 className="h1">Админка</h1>
      <p className="sub">Реестр занятий, проблемы и&nbsp;пользователи появятся здесь.</p>
    </>
  );
}
