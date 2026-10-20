import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Lesson } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { useNow } from '../../lib/useNow';
import { Button, EmptyState, FormError, IconButton, LessonCard, LoadingList, Modal, Note, OptionChips, PageHeader, QueryView, Section, Tabs, TextArea, useToast } from '../../ui';

type Scope = 'upcoming' | 'past';
const DECLINE_REASONS = ['Это время занято', 'Не веду этот предмет', 'Не подходит уровень ученика', 'Другое'];

/** Причина отказа: обязательна, ученик увидит её в карточке урока. */
export function DeclineModal({ lesson, open, onClose, onDone }: { lesson: Lesson; open: boolean; onClose: () => void; onDone: (l: Lesson) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const decline = useMutation((text: string) => api.declineLesson(lesson.id, text));
  const submit = async () => {
    const text = reason === 'Другое' ? other.trim() : reason ?? '';
    if (!text) return;
    const updated = await decline.run(text);
    if (updated) { setReason(null); setOther(''); onDone(updated); }
  };
  const ready = reason !== null && (reason !== 'Другое' || other.trim().length > 0);
  return (
    <Modal open={open} onClose={onClose} title="Отклонить запись?" footer={<><Button variant="fill" onClick={onClose}>Не отклонять</Button><Button variant="danger" onClick={submit} disabled={!ready} loading={decline.pending}>Отклонить</Button></>}>
      <OptionChips options={DECLINE_REASONS} value={reason} onChange={setReason} label="Причина" />
      {reason === 'Другое' && <TextArea label="Что написать ученику" value={other} onChange={(e) => setOther(e.target.value)} rows={3} />}
      <FormError error={decline.error} />
    </Modal>
  );
}

/** Уроки репетитора: сверху — записи, которые ждут ответа; ниже — предстоящие и прошедшие. */
export default function TutorLessonsPage() {
  const toast = useToast();
  const now = useNow();
  const [scope, setScope] = useState<Scope>('upcoming');
  const [declining, setDeclining] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const profile = useQuery('my-profile', () => api.getMyProfile());
  const lessons = useQuery(`lessons-${scope}`, () => api.listLessons(scope));
  const upcoming = useQuery('lessons-upcoming-all', () => api.listLessons('upcoming'));
  const confirm = useMutation((id: string) => api.confirmLesson(id));
  const result = useMutation((input: { id: string; result: 'happened' | 'no_show_student' }) => api.markLessonResult(input.id, input.result));

  const refresh = () => { lessons.reload(); upcoming.reload(); };
  const answer = async (l: Lesson) => {
    setBusy(l.id);
    const done = await confirm.run(l.id);
    setBusy(null);
    if (done) { toast('Запись подтверждена'); refresh(); }
  };
  const mark = async (l: Lesson, value: 'happened' | 'no_show_student') => {
    setBusy(l.id);
    const done = await result.run({ id: l.id, result: value });
    setBusy(null);
    if (done) { toast(value === 'happened' ? 'Урок отмечен как состоявшийся' : 'Отметили: ученик не пришёл'); refresh(); }
  };
  const pending = (upcoming.data ?? []).filter((l) => l.status === 'pending');
  const ended = (l: Lesson) => l.status === 'confirmed' && new Date(l.start).getTime() + l.durationMin * 60_000 < now;

  return (
    <AppLayout role="tutor">
      <PageHeader title="Уроки" actions={<IconButton icon="clock" label="Расписание" to="/tutor/schedule" />} />
      {profile.data?.status === 'draft' && (
        <Note tone="info" icon="edit" action={<Button size="s" to="/tutor/profile/edit">Заполнить анкету</Button>}>Анкета ещё не опубликована: ученики вас не видят. Это займёт около 15 минут.</Note>
      )}
      <FormError error={confirm.error ?? result.error} />
      {pending.length > 0 && (
        <Section title="Ждут подтверждения">
          <div className="trk-list">
            {pending.map((l, i) => (
              <LessonCard key={l.id} lesson={l} role="tutor" delay={i * 0.05} actions={<>
                <Button size="s" onClick={() => answer(l)} loading={busy === l.id}>Подтвердить</Button>
                <Button size="s" variant="fill" onClick={() => setDeclining(l)}>Отклонить</Button>
              </>} />
            ))}
          </div>
        </Section>
      )}
      <Tabs<Scope> items={[{ value: 'upcoming', label: 'Предстоящие' }, { value: 'past', label: 'Прошедшие' }]} value={scope} onChange={setScope} />
      <QueryView
        query={lessons}
        loading={<LoadingList rows={3} height={132} />}
        empty={(items) => (items.length ? null : (
          scope === 'upcoming'
            ? <EmptyState icon="cal" title="Пока нет записей" text="Когда ученик запишется, урок появится здесь. Проверьте, что в расписании открыто время." actions={<Button to="/tutor/schedule">Открыть расписание</Button>} />
            : <EmptyState icon="cal" title="Прошедших уроков пока нет" text="Здесь появятся состоявшиеся и отменённые уроки." />
        ))}
      >
        {(items) => (
          <div className="trk-list">
            {items.map((l, i) => (
              <LessonCard key={l.id} lesson={l} role="tutor" delay={i * 0.05} actions={ended(l) ? <>
                <Button size="s" onClick={() => mark(l, 'happened')} loading={busy === l.id}>Урок состоялся</Button>
                <Button size="s" variant="fill" onClick={() => mark(l, 'no_show_student')}>Ученик не пришёл</Button>
              </> : undefined} />
            ))}
          </div>
        )}
      </QueryView>
      {declining && <DeclineModal lesson={declining} open onClose={() => setDeclining(null)} onDone={() => { setDeclining(null); toast('Запись отклонена'); refresh(); }} />}
    </AppLayout>
  );
}
