import type { Booking, BookingStatus } from '../api/booking';

type Shown = BookingStatus | 'past' | 'review';

const PILL: Record<Shown, { text: string; cls: string }> = {
  pending: { text: 'Ждёт подтверждения', cls: 'wait' },
  confirmed: { text: 'Подтверждено', cls: 'ok' },
  declined: { text: 'Отклонено', cls: 'bad' },
  cancelled: { text: 'Отменено', cls: '' },
  completed: { text: 'Прошло', cls: '' },
  past: { text: 'Прошло', cls: '' },
  review: { text: 'На рассмотрении', cls: 'act' },
};

/** What the student sees (У4.3): a confirmed lesson that has ended reads «Прошло»; an open problem reads «На рассмотрении» (У7.5). */
export function shownStatus(b: Pick<Booking, 'status' | 'endsAt'> & { problem?: Booking['problem'] }, at: number): Shown {
  if (b.problem?.status === 'open') return 'review';
  return b.status === 'confirmed' && b.endsAt <= at ? 'past' : b.status;
}

export function StatusPill({ status }: { status: Shown }) {
  const p = PILL[status];
  return <span className={`pill ${p.cls}`}>{p.text}</span>;
}

/** «Новое»: the booking has unread notifications (mockup cabinet). */
export function NewPill() {
  return <span className="pill act">Новое</span>;
}
