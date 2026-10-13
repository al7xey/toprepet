import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getMyBooking, reportProblem, type Booking, type ProblemKind } from '../../api/booking';
import { useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { autoCompleteAt, awaitsReview } from '../../lib/lessons';
import { first, instrumental } from '../../lib/names';
import { fmtDayTime, now } from '../../lib/time';
import { TextAreaField } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { NotFound } from '../common/NotFound';
import { reachGoal } from '../../app/metrika';

/* У7.5: the three kinds the database knows (problem_kind) with the spec's wording. */
const KINDS: { id: ProblemKind; label: string }[] = [
  { id: 'no_show', label: 'Репетитор не пришёл' },
  { id: 'technical', label: 'Занятие не состоялось по технической причине' },
  { id: 'other', label: 'Другое' },
];

/** /cabinet/lessons/:id/problem (mockup problem): what happened and a description; then the card shows «На рассмотрении». */
export function ProblemPage() {
  usePageMeta('Сообщить о проблеме', { noindex: true });
  const { id = '' } = useParams();
  const lesson = useAsync(() => getMyBooking(Number(id)), id);
  if (lesson.loading) return <Loading />;
  if (lesson.error) return <LoadError title="Не получилось загрузить занятие" onRetry={lesson.reload} />;
  if (!lesson.data) return <NotFound />;
  // the form exists only between the end of the lesson and its automatic completion, once
  if (lesson.data.problem || !awaitsReview(lesson.data, now())) return <Navigate to={`/cabinet/lessons/${lesson.data.id}`} replace />;
  return <Form b={lesson.data} />;
}

function Form({ b }: { b: Booking }) {
  const tz = useViewerZone();
  const navigate = useNavigate();
  const [kind, setKind] = useState<ProblemKind | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [kindError, setKindError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = first(b.tutorName);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!kind) {
      setKindError('Выберите, что случилось.');
      return;
    }
    setBusy(true);
    const res = await reportProblem(b.id, kind, text);
    setBusy(false);
    if (res.ok) reachGoal('problem_reported');
    if (res.ok || res.reason === 'already_reported') {
      void navigate(`/cabinet/lessons/${b.id}`, { replace: true });
      return;
    }
    setError(
      res.reason === 'not_finished'
        ? 'Сообщить о проблеме можно только после окончания занятия.'
        : 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз.',
    );
  }

  return (
    <form className="stack l" onSubmit={e => void submit(e)} noValidate style={{ maxWidth: 620 }}>
      <Link className="back" to={`/cabinet/lessons/${b.id}`}>
        К занятию
      </Link>
      <div className="stack s">
        <h1 className="h1">Что случилось?</h1>
        <p className="sub">
          {b.subjectName} с&nbsp;{instrumental(name)}, {fmtDayTime(b.startsAt, tz)}
        </p>
      </div>
      <fieldset className="stack s" aria-describedby={kindError ? 'kind-err' : undefined}>
        <legend className="sr-only">Что случилось</legend>
        <div className="opts col">
          {KINDS.map(k => (
            <label key={k.id} className="opt">
              <input
                type="radio"
                name="kind"
                value={k.id}
                checked={kind === k.id}
                onChange={() => {
                  setKind(k.id);
                  setKindError(null);
                }}
              />
              {k.label}
            </label>
          ))}
        </div>
        {kindError ? (
          <span className="err" id="kind-err" role="alert">
            {kindError}
          </span>
        ) : null}
      </fieldset>
      <TextAreaField
        label="Подробнее"
        value={text}
        maxLength={2000}
        onChange={e => setText(e.target.value)}
        placeholder="Например: ждали 20 минут, ссылка не открывалась"
        hint={`Можно сообщить до ${fmtDayTime(autoCompleteAt(b.endsAt), tz)}.`}
      />
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn p" disabled={busy} style={{ justifySelf: 'start' }}>
        Отправить
      </button>
    </form>
  );
}
