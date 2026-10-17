import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { whenLabel } from '../../lib/format';
import { Button, Card, FormError, Note, PageHeader, Person, QueryView, RatingInput, TextArea, lessonTitle, useToast } from '../../ui';

const MIN = 20;

/** Отзыв об уроке: оценка и текст. До публикации отзыв проверяет поддержка. */
export default function ReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const lesson = useQuery(`lesson-${id}`, () => api.getLesson(id));
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const send = useMutation((lessonId: string) => api.createReview(lessonId, rating, text.trim()));
  const textError = touched && text.trim().length < MIN ? `Напишите хотя бы ${MIN} символов: так отзыв будет полезен другим ученикам` : undefined;
  const submit = async () => {
    setTouched(true);
    if (!rating || text.trim().length < MIN) return;
    const review = await send.run(id);
    if (review) { toast('Спасибо! Отзыв отправлен на проверку'); void navigate(`/me/lessons/${id}`); }
  };
  return (
    <AppLayout role="student" narrow>
      <QueryView query={lesson} empty={() => null}>
        {(l) => (
          <>
            <PageHeader title="Отзыв об уроке" back={{ to: `/me/lessons/${l.id}`, label: lessonTitle(l) }} lead={whenLabel(l.start)} />
            {l.reviewId || l.status !== 'completed' || l.kind !== 'regular' ? (
              <Note tone="plain" icon="info" action={<Button size="s" to={`/me/lessons/${l.id}`}>К уроку</Button>}>
                {l.reviewId ? 'Вы уже оставили отзыв об этом уроке.' : 'Отзыв можно оставить после проведённого оплаченного урока.'}
              </Note>
            ) : (
              <Card>
                <Person name={l.tutorName} photo={l.tutorPhoto} sub={l.subject} />
                <form className="trk-form" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
                  <RatingInput value={rating} onChange={setRating} label="Как прошёл урок?" error={touched && !rating ? 'Поставьте оценку' : undefined} />
                  <TextArea label="Ваш отзыв" rows={6} maxLength={1000} placeholder="Что понравилось, чему научились, что можно улучшить" value={text} onChange={(e) => setText(e.target.value)} hint={`${text.trim().length} из ${MIN} символов минимум`} error={textError} />
                  <Note tone="plain" icon="shield">Отзыв проверит поддержка, затем он появится в анкете репетитора. Контакты и ссылки в отзывах не публикуются.</Note>
                  <FormError error={send.error} />
                  <div className="trk-actions">
                    <Button type="submit" size="lg" loading={send.pending}>Отправить отзыв</Button>
                    <Button variant="fill" size="lg" to={`/me/lessons/${l.id}`}>Позже</Button>
                  </div>
                </form>
              </Card>
            )}
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}
