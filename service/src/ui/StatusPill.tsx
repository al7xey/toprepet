import type { Booking, BookingStatus } from '../api/booking';

type Shown = BookingStatus | 'past';

const PILL: Record<Shown, { text: string; cls: string }> = {
  pending: { text: 'Ждёт подтверждения', cls: 'wait' },
  confirmed: { text: 'Подтверждено', cls: 'ok' },
  declined: { text: 'Отклонено', cls: 'bad' },
  cancelled: { text: 'Отменено', cls: '' },
  completed: { text: 'Прошло', cls: '' },
  past: { text: 'Прошло', cls: '' },
};

/** What the student sees (У4.3): a confirmed lesson that has ended reads «Прошло». */
export function shownStatus(b: Pick<Booking, 'status' | 'endsAt'>, at: number): Shown {
  return b.status === 'confirmed' && b.endsAt <= at ? 'past' : b.status;
}

export function StatusPill({ status }: { status: Shown }) {
  const p = PILL[status];
  return <span className={`pill ${p.cls}`}>{p.text}</span>;
}
