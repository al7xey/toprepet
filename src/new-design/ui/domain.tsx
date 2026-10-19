import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useMutation } from '../api/hooks';
import type { Card as PayCard, Lesson, Role, Slot, Tutor } from '../api/types';
import { dayLabel, fromRub, minutes, rub, timeLabel, until, whenLabel } from '../lib/format';
import { useNow } from '../lib/useNow';
import { rv } from '../reveal';
import { Icon } from './icon';
import { Modal } from './overlay';
import { Button, FormError, Note, Person, Status, TextField, type Tone } from './kit';

/* ---------- Репетиторы ---------- */

/** Карточка репетитора: фото, имя, предметы, цена третьей строкой. Одна на главной, в каталоге и в подборках. */
export function TutorCard({ tutor, priority }: { priority?: boolean; tutor: Pick<Tutor, 'id' | 'name' | 'photo' | 'photoSrcSet' | 'cardSubjects' | 'studentPrice' | 'rating'>}) {
  return (
    <Link className="tc s" to={`/teachers/${tutor.id}/`} aria-label={`${tutor.name}, ${tutor.cardSubjects}`} draggable={false}>
      <img src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 280px, 50vw" alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" draggable={false} />
      <span className="pl">
        <b>{tutor.name}{tutor.rating ? <span className="rt"><Icon name="star-on" />{String(tutor.rating).replace('.', ',')}</span> : null}</b>
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
      {tutors.map((t, index) => <TutorCard key={t.id} tutor={t} priority={layout === 'row' || index < 8} />)}
      {children}
    </div>
  );
}

/** Анкета ученика для репетитора: фото слева, имя и подпись справа. Без фото — пустая заглушка. */
export function StudentCard({ name, photo, sub, children, small }: { name: string; photo?: string | null; sub?: ReactNode; children?: ReactNode; small?: boolean }) {
  return (
    <div className={small ? 'trk-student small' : 'trk-student'}>
      <div className="trk-student-photo">{photo ? <img src={photo} alt={`Фото: ${name}`} loading="lazy" decoding="async" /> : <Icon name="user" />}</div>
      <div className="trk-student-text"><b>{name}</b>{sub && <span>{sub}</span>}{children}</div>
    </div>
  );
}

/* ---------- Уроки ---------- */

const STATUS: Record<Lesson['status'], { tone: Tone; icon: string; student: string; tutor: string }> = {
  pending: { tone: 'wait', icon: 'clock', student: 'Ждёт подтверждения', tutor: 'Нужно подтвердить' },
  confirmed: { tone: 'ok', icon: 'check', student: 'Подтверждён', tutor: 'Подтверждён' },
  declined: { tone: 'bad', icon: 'x', student: 'Отклонён', tutor: 'Вы отклонили' },
  expired: { tone: 'neutral', icon: 'clock', student: 'Не подтверждён вовремя', tutor: 'Время на ответ вышло' },
  cancelled: { tone: 'bad', icon: 'x', student: 'Отменён', tutor: 'Отменён' },
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
  const who = role === 'tutor' ? { name: lesson.studentName, photo: lesson.studentPhoto } : { name: lesson.tutorName, photo: lesson.tutorPhoto };
  return (
    <article className="lesson trk-lesson" {...rv('up', delay)}>
      <Link className="trk-lesson-link" to={lessonHref(lesson, role)} aria-label={`${lessonTitle(lesson)}, ${whenLabel(lesson.start)}`} />
      <div className="lesson-when"><b className="tn">{whenLabel(lesson.start)}</b><span>{lessonTitle(lesson)} · {minutes(lesson.durationMin)}</span></div>
      <Person name={who.name} photo={who.photo} sub={lesson.status === 'pending' && lesson.confirmBy && role === 'tutor' ? `Ответьте ${until(lesson.confirmBy)}` : lesson.kind === 'intro' ? 'Знакомство бесплатно' : rub(role === 'tutor' ? lesson.tutorPrice : lesson.price)} />
      <div className="trk-lesson-status"><LessonStatus lesson={lesson} role={role} /></div>
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
  // занятое время не показываем вовсе: только свободные слоты и дни, где они есть
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      if (!s.available) continue;
      const key = new Date(s.start).toDateString();
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].slice(0, days);
  }, [slots, days]);
  const selectedDay = value ? new Date(value).toDateString() : null;
  const [day, setDay] = useState<string | null>(null);
  const current = day ?? selectedDay ?? byDay[0]?.[0] ?? null;
  const list = byDay.find(([k]) => k === current)?.[1] ?? [];

  if (loading) return <div className="trk-slot-skel" aria-busy="true"><span className="skel" /><span className="skel" /></div>;
  if (!byDay.length) return <p className="muted">Свободного времени на ближайшие дни нет. Напишите репетитору или загляните позже.</p>;

  return (
    <div className="trk-slots">
      <div className="dates trh-dates" role="tablist" aria-label="День">
        {byDay.map(([key, items]) => {
          const date = new Date(items[0].start);
          return (
            <button key={key} type="button" role="tab" aria-selected={key === current} className={`date${key === current ? ' sel' : ''}`} onClick={() => setDay(key)}>
              <small>{date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '')}</small><b>{date.getDate()}</b>
            </button>
          );
        })}
      </div>
      <div className="slots trh-slots" aria-label={current ? dayLabel(list[0]?.start ?? new Date()) : undefined}>
        {list.map((s) => (
          <button key={s.start} type="button" className={`slot${s.start === value ? ' sel' : ''}`} aria-pressed={s.start === value} onClick={() => onChange(s.start)}>
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

/** Добавление карты. В демо-режиме поля ввода; с настоящим бэкендом здесь встанет виджет платёжного провайдера (номер карты не должен попадать на наш сервер). */
export function AddCardModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (card: PayCard) => void }) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const add = useMutation((input: { number: string; expiry: string; cvc: string }) => api.addCard(input));
  const save = async () => {
    const card = await add.run({ number, expiry, cvc });
    if (card) { setNumber(''); setExpiry(''); setCvc(''); onAdded(card); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Новая карта" footer={<><Button variant="fill" onClick={onClose}>Отмена</Button><Button onClick={save} loading={add.pending}>Сохранить карту</Button></>}>
      <Note tone="plain" icon="lock">Демо-режим: карта не списывается. Попробуйте номер 4000 0000 0000 0002.</Note>
      <TextField label="Номер карты" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={number} onChange={(e) => setNumber(e.target.value)} />
      <div className="trk-two">
        <TextField label="Срок" autoComplete="cc-exp" placeholder="ММ/ГГ" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        <TextField label="CVC" inputMode="numeric" autoComplete="cc-csc" placeholder="000" value={cvc} onChange={(e) => setCvc(e.target.value)} />
      </div>
      <FormError error={add.error} />
    </Modal>
  );
}
