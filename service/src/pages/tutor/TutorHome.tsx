import { getPublishCheck } from '../../api/tutor';
import { useSession } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { first } from '../../lib/names';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* Р1.1 + Р4.1-сводка: right after sign-up the tutor sees what the profile still needs for publication.
   New bookings and upcoming lessons join this page with bookings (iterations 2–4). */
export function TutorHome() {
  usePageMeta('Сводка', { noindex: true });
  const { profile } = useSession();
  const id = profile?.id ?? '';
  const check = useAsync(() => getPublishCheck(id), id);

  return (
    <>
      <h1 className="h1">Здравствуйте, {first(profile?.name ?? '')}</h1>
      {check.loading ? (
        <Loading />
      ) : check.error || !check.data ? (
        <LoadError title="Не получилось загрузить сводку" onRetry={check.reload} />
      ) : check.data.status === 'published' ? (
        <section className="card f" aria-label="Анкета">
          <span className="mut sm">Анкета</span>
          <b>Опубликована</b>
        </section>
      ) : (
        <section className="card f" aria-labelledby="pub-title">
          <span className="mut sm">Анкета</span>
          <b className="h3" id="pub-title">
            {check.data.status === 'hidden' ? 'Скрыта администратором' : 'Не опубликована'}
          </b>
          <p>Чтобы анкета появилась в&nbsp;каталоге, нужны:</p>
          <ul className="chk" aria-label="Что нужно для публикации">
            {(
              [
                ['Фото', check.data.photo],
                ['Имя', check.data.name],
                ['Предмет с ценой', check.data.subjectWithPrice],
                ['Свободное время в расписании', check.data.freeTime],
              ] as const
            ).map(([label, done]) => (
              <li key={label} className={done ? 'y' : 'n'} data-done={done}>
                {label}
                <span className="sr-only">{done ? ' — готово' : ' — не хватает'}</span>
              </li>
            ))}
          </ul>
          <p className="hint">Анкета появится в&nbsp;каталоге сразу, без проверки.</p>
        </section>
      )}
    </>
  );
}
