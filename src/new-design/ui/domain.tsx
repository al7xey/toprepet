import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Lesson, Role, Slot, Tutor } from '../api/types';
import { dayLabel, fromRub, minutes, rub, timeLabel, until, whenLabel } from '../lib/format';
import { useNow } from '../lib/useNow';
import { rv } from '../reveal';
import { Icon } from './icon';
import { Person, Status, type Tone } from './kit';

/* ---------- Репетиторы ---------- */

/** Карточка репетитора: фото, имя, предметы, цена третьей строкой. Одна на главной, в каталоге и в подборках. */
export function TutorCard({ tutor, delay = 0 }: { tutor: Pick<Tutor, 'id' | 'name' | 'photo' | 'photoSrcSet' | 'cardSubjects' | 'studentPrice' | 'rating'>; delay?: number }) {
  return (
    <Link className="tc s" to={`/teachers/${tutor.id}/`} aria-label={`${tutor.name}, ${tutor.cardSubjects}`} draggable={false} {...rv('scale', delay)}>
      <img src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 280px, 50vw" alt="" loading="lazy" decoding="async" draggable={false} />
      <span className="pl">
        <b>{tutor.name}{tutor.rating ? <span className="rt"><Icon name="star-on" />{String(tutor.rating).replace('.', ',')}</span> : <span className="rt new">новый</span>}</b>
        <span>{tutor.cardSubjects}</span>
        <span className="trh-price">{fromRub(tutor.studentPrice)}</span>
      </span>
    </Link>
  );
}

/** Сетка карточек: grid — 4 в ряд (2 на телефоне), row — лента с прокруткой на телефоне. */
export function TutorGrid({ tutors, layout = 'grid', children }: { tutors: Parameters<typeof TutorCard>[0]['tutor'][]; layout?: 'grid' | 'row'; children?: ReactNode }) {
  return (
    <div className={layout === 'row' ? 'tcg trh-teachers' : 'tcg trh-grid'}>
      {tutors.map((t, index) => <TutorCard key={t.id} tutor={t} delay={(index % 4) * 0.07} />)}
      {children}
    </div>
  );
}

/* ---------- Уроки ---------- */

const STATUS: Record<Lesson['status'], { tone: Tone; icon: string; student: string; tutor: string }> = {
  pending: { tone: 'wait', icon: 'clock', student: 'Ждёт подтверждения', tutor: 'Нужно подтвердить' },
  confirmed: { tone: 'ok', icon: 'check', student: 'Подтверждён', tutor: 'Подтверждён' },
  declined: { tone: 'bad', icon: 'x', student: 'Отклонён', tutor: 'Вы отклонили' },
  expired: { tone: 'neutral', icon: 'clock', student: 'Не подтверждён вовремя', tutor: 'Время на ответ вышло' },
  cancelled: { tone: 'neutral', icon: 'x', student: 'Отменён', tutor: 'Отменён' },
  completed: { tone: 'ok', icon: 'check', student: 'Состоялся', tutor: 'Состоялся' },
  no_show_student: { tone: 'bad', icon: 'alert', student: 'Неявка ученика', tutor: 'Ученик не пришёл' },
  no_show_tutor: { tone: 'bad', icon: 'alert', student: 'Репетитор не пришёл', tutor: 'Неявка репетитора' },
  disputed: { tone: 'info', icon: 'flag', student: 'Разбираемся', tutor: 'Спор по уроку' },
};

export function LessonStatus({ lesson, role }: { lesson: Lesson; role: Role }) {
  const s = STATUS[lesson.status];
  const now = useNow();
  const start = new Date(lesson.start).getTime();
  const live = lesson.status === 'confirmed' && now >= start && now < start + lesson.durationMin * 60_000;
  if (live) return <Status tone="info" icon="video">Идёт сейчас</Status>;
  return <Status tone={s.tone} icon={s.icon}>{role === 'tutor' ? s.tutor : s.student}</Status>;
}

export const lessonTitle = (l: Lesson) => (l.kind === 'intro' ? 'Бесплатное знакомство' : l.subject);
export const lessonHref = (l: Lesson, role: Role) => (role === 'tutor' ? `/tutor/lessons/${l.id}` : `/me/lessons/${l.id}`);

/** Карточка урока в списках ученика и репетитора. */
export function LessonCard({ lesson, role, actions, delay = 0 }: { lesson: Lesson; role: Role; actions?: ReactNode; delay?: number }) {
  const who = role === 'tutor' ? { name: lesson.studentName, photo: null } : { name: lesson.tutorName, photo: lesson.tutorPhoto };
  return (
    <article className="lesson trk-lesson" {...rv('up', delay)}>
      <Link className="trk-lesson-link" to={lessonHref(lesson, role)} aria-label={`${lessonTitle(lesson)}, ${whenLabel(lesson.start)}`} />
      <div className="lesson-top">
        <div className="lesson-when"><b className="tn">{whenLabel(lesson.start)}</b><span>{lessonTitle(lesson)} · {minutes(lesson.durationMin)}</span></div>
        <LessonStatus lesson={lesson} role={role} />
      </div>
      <Person name={who.name} photo={who.photo} sub={lesson.status === 'pending' && lesson.confirmBy && role === 'tutor' ? `Ответьте ${until(lesson.confirmBy)}` : lesson.kind === 'intro' ? 'Знакомство бесплатно' : rub(role === 'tutor' ? lesson.tutorPrice : lesson.price)} />
      {actions && <div className="trk-lesson-actions">{actions}</div>}
    </article>
  );
}

/* ---------- Выбор времени ---------- */

/**
 * Календарь записи: дни сверху, время ниже. Один компонент для анкеты, записи, переноса и откликов.
 * slots — свободные и занятые окна от сервера, value — выбранное начало (ISO).
 */
export function SlotPicker({ slots, value, onChange, days = 7, loading }: { slots: Slot[]; value: string | null; onChange: (start: string) => void; days?: number; loading?: boolean }) {
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.start).toDateString();
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].slice(0, days);
  }, [slots, days]);
  const selectedDay = value ? new Date(value).toDateString() : null;
  const [day, setDay] = useState<string | null>(null);
  const current = day ?? selectedDay ?? byDay.find(([, list]) => list.some((s) => s.available))?.[0] ?? byDay[0]?.[0] ?? null;
  const list = byDay.find(([k]) => k === current)?.[1] ?? [];

  if (loading) return <div className="trk-slot-skel" aria-busy="true"><span className="skel" /><span className="skel" /></div>;
  if (!byDay.length) return <p className="muted">Свободного времени на ближайшие дни нет. Напишите репетитору или загляните позже.</p>;

  return (
    <div className="trk-slots">
      <div className="dates trh-dates" role="tablist" aria-label="День">
        {byDay.map(([key, items]) => {
          const date = new Date(items[0].start);
          const free = items.some((s) => s.available);
          return (
            <button key={key} type="button" role="tab" aria-selected={key === current} className={`date${key === current ? ' sel' : ''}${free ? '' : ' trk-off'}`} onClick={() => setDay(key)}>
              <small>{date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '')}</small><b>{date.getDate()}</b>
            </button>
          );
        })}
      </div>
      <div className="slots trh-slots" aria-label={current ? dayLabel(list[0]?.start ?? new Date()) : undefined}>
        {list.map((s) => (
          <button key={s.start} type="button" className={`slot${s.start === value ? ' sel' : ''}${s.available ? '' : ' off'}`} disabled={!s.available} aria-pressed={s.start === value} onClick={() => onChange(s.start)}>
            {timeLabel(s.start)}
          </button>
        ))}
      </div>
      <span className="muted sm trk-tz"><Icon name="globe" />Время московское</span>
    </div>
  );
}

/* ---------- Сообщения ---------- */

export function Bubble({ mine, system, text, at }: { mine?: boolean; system?: boolean; text: string; at?: string }) {
  if (system) return <div className="bubble b-sys">{text}</div>;
  return <div className={`bubble ${mine ? 'b-out' : 'b-in'}`}>{text}{at && <small>{timeLabel(at)}</small>}</div>;
}
