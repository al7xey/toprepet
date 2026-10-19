import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import type { TutorStatus } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub } from '../../lib/format';
import { Button, Card, CardTitle, Note, PageHeader, QueryView, Rows, Section, Status, Tags } from '../../ui';

const STATUS: Record<TutorStatus, { tone: 'ok' | 'wait' | 'neutral' | 'bad'; text: string }> = {
  draft: { tone: 'neutral', text: 'Черновик' },
  review: { tone: 'wait', text: 'На проверке' },
  published: { tone: 'ok', text: 'Опубликована' },
  hidden: { tone: 'bad', text: 'Скрыта' },
};
const DOC: Record<string, { tone: 'ok' | 'wait' | 'neutral' | 'bad'; text: string }> = {
  uploaded: { tone: 'neutral', text: 'Загружен' },
  checking: { tone: 'wait', text: 'Проверяем' },
  approved: { tone: 'ok', text: 'Проверен' },
  rejected: { tone: 'bad', text: 'Отклонён' },
};

/** Моя анкета: статус, содержание и документы. */
export default function TutorProfilePage() {
  const profile = useQuery('my-profile', () => api.getMyProfile());
  const documents = useQuery('my-documents', () => api.listDocuments());
  return (
    <AppLayout role="tutor" narrow>
      <QueryView query={profile}>
        {(p) => (
          <>
            <PageHeader title="Моя анкета" />
            <section className="trk-profile-card" aria-label="Анкета">
              <div className="trk-profile-photo">
                {p.photo ? <img src={p.photo} alt={`Фото: ${p.name}`} /> : <div className="trk-photo-empty">Фото не загружено</div>}
              </div>
              <div className="trk-profile-body">
                <Status tone={STATUS[p.status].tone}>{STATUS[p.status].text}</Status>
                <h2 className="trk-profile-name">{p.name || 'Без имени'}</h2>
                <p className="muted">{p.headline || 'Короткое описание не заполнено'}</p>
                {p.subjects.length > 0 && <Tags items={p.subjects} />}
                <Rows rows={[
                  ['Цена за урок', p.price ? rub(p.price) : 'Не указана'],
                  ['Бесплатное знакомство', p.introMinutes ? minutes(p.introMinutes) : 'Нет'],
                  ['Опыт', p.experience || 'Не указан'],
                ]} />
              </div>
            </section>
            <div className="trk-profile-actions">
              <Button to="/tutor/profile/edit" icon="edit" block>Редактировать</Button>
              {p.status === 'published' && <Button to={`/teachers/${p.slug}/`} variant="line" icon="search" block>Посмотреть как ученик</Button>}
            </div>
            {p.status === 'review' && <Note tone="info" icon="clock">Мы проверяем анкету, обычно это занимает до одного рабочего дня. Когда она будет опубликована, придёт уведомление.</Note>}
            {p.status === 'draft' && p.moderationNote && <Note tone="bad" icon="alert" action={<Button size="s" to="/tutor/profile/edit">Исправить</Button>}>Анкету вернули на доработку: {p.moderationNote}</Note>}
            {p.status === 'draft' && !p.moderationNote && <Note tone="info" icon="edit" action={<Button size="s" to="/tutor/profile/edit">Продолжить</Button>}>Анкета ещё не опубликована. Заполните её, и ученики смогут записываться.</Note>}
            <Section title="Документы">
              <QueryView query={documents} loading={<span className="muted">Загружаем…</span>} empty={(items) => (items.length ? null : <p className="muted">Документов пока нет. Диплом и сертификаты можно добавить в мастере анкеты.</p>)}>
                {(items) => <div className="trk-list">{items.map((d) => <Card key={d.id}><div className="trk-exrow"><CardTitle>{d.title}</CardTitle><Status tone={DOC[d.status].tone}>{DOC[d.status].text}</Status></div></Card>)}</div>}
              </QueryView>
            </Section>
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}
