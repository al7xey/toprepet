import type { ReactNode } from 'react';
import { api, studentPriceOf } from '../../api';
import { useQuery } from '../../api/hooks';
import type { TutorStatus } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub } from '../../lib/format';
import { Button, Card, Icon, IconButton, Note, PageHeader, QueryView, Rows, Section, Status, Tags } from '../../ui';

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

/** Моя анкета: статус и вся основная информация в ячейках-таблице, ниже документы. */
export default function TutorProfilePage() {
  const profile = useQuery('my-profile', () => api.getMyProfile());
  const documents = useQuery('my-documents', () => api.listDocuments());
  return (
    <AppLayout role="tutor" narrow>
      <QueryView query={profile}>
        {(p) => (
          <>
            <PageHeader title="Моя анкета" back={{ to: '/tutor/account', label: 'Профиль' }} actions={<IconButton icon="edit" label="Редактировать анкету" to="/tutor/profile/edit" />} />
            <div className="trk-profile-status"><Status tone={STATUS[p.status].tone}>{STATUS[p.status].text}</Status><span className="muted sm">Так анкету видят ученики</span></div>
            <Card pad="sm">
              <article className="trk-preview">
                <div className="trk-preview-photo">{p.photo ? <img src={p.photo} alt={`Фото: ${p.name}`} /> : <div className="trk-photo-empty">Фото не добавлено</div>}</div>
                <div className="trk-preview-head">
                  <h2>{p.name || 'Без имени'}</h2>
                  <p className="muted">{p.headline || 'Короткое описание не заполнено'}</p>
                  {p.introMinutes > 0 && <span className="trh-pf-intro-tag"><Icon name="gift" />Бесплатное знакомство</span>}
                </div>
                {p.about.trim() && <section><h3>О себе</h3><p>{p.about}</p></section>}
                {p.education.some((e) => e.title.trim() || e.text.trim()) && (
                  <section><h3>Образование и достижения</h3>
                    <ul className="ach">
                      {p.education.filter((e) => e.title.trim() || e.text.trim()).map((e, i) => (
                        <li key={i}><span className="ic-sq"><Icon name={['target', 'school', 'book'][i % 3]} /></span><div>{e.title.trim() && <b>{e.title}</b>}{e.text.trim() && <span className="d">{e.text}</span>}</div></li>
                      ))}
                    </ul>
                  </section>
                )}
                {p.subjects.length > 0 && <section><h3>Предметы</h3><Tags items={p.subjects} /></section>}
                {p.experience && <section><h3>Опыт</h3><Tags items={[p.experience]} /></section>}
                {p.approach.trim() && <section><h3>Как проходят занятия</h3><p>{p.approach}</p></section>}
                <section>
                  <h3>Цены</h3>
                  <Rows boxed rows={[...(p.introMinutes ? [['Знакомство', `${minutes(p.introMinutes)}, бесплатно`] as [string, string]] : []), ['Занятие, 60 минут', p.price ? rub(studentPriceOf(p.price)) : 'Не указана']]} />
                </section>
              </article>
            </Card>
            <div className="trk-profile-actions">
              <Button to="/tutor/profile/edit" icon="edit" block>Редактировать</Button>
              {p.status === 'published' && <Button to={`/teachers/${p.slug}/`} variant="line" icon="search" block>Открыть как ученик</Button>}
            </div>
            {p.status === 'review' && <Note tone="info" icon="clock">Мы проверяем анкету, обычно это занимает до одного рабочего дня. Когда она будет опубликована, придёт уведомление.</Note>}
            {p.status === 'draft' && p.moderationNote && <Note tone="bad" icon="alert" action={<Button size="s" to="/tutor/profile/edit">Исправить</Button>}>Анкету вернули на доработку: {p.moderationNote}</Note>}
            {p.status === 'draft' && !p.moderationNote && <Note tone="info" icon="edit" action={<Button size="s" to="/tutor/profile/edit">Продолжить</Button>}>Анкета ещё не опубликована. Заполните её, и ученики смогут записываться.</Note>}
            <Section title="Документы">
              <QueryView query={documents} loading={<span className="muted">Загружаем…</span>} empty={(items) => (items.length ? null : <p className="muted">Документов пока нет. Диплом и сертификаты можно добавить в мастере анкеты.</p>)}>
                {(items) => <Rows boxed rows={items.map((d) => [d.title, <Status key={d.id} tone={DOC[d.status].tone}>{DOC[d.status].text}</Status>] as [string, ReactNode])} />}
              </QueryView>
            </Section>
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}
