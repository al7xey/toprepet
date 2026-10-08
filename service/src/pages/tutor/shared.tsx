import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../ui/icons';
import { cx } from '../../ui/kit';
import { TeacherCard, catalogItem } from '../../ui/domain';
import { useDb, tutors as tApi } from '../../api';
import type { TutorProfile } from '../../api/types';
import { nb } from '../../lib/text';
import { NB, fmtTime } from '../../lib/time';

export const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/* photos are scaled down before they go into local storage */
export function resizeImage(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Не удалось прочитать файл'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Это не похоже на фото'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}

export function ReqList({ t }: { t: TutorProfile }) {
  return (
    <div className="r2-checks">
      {tApi.requirements(t).map(r => <div key={r.id}><span className={cx('r2-ok', !r.done && 'no')}><Icon name={r.done ? 'check' : 'plus'} /></span>{r.label}</div>)}
    </div>
  );
}

export function PrevCard({ t, title = 'Так вас увидят в каталоге' }: { t: TutorProfile; title?: string }) {
  const d = useDb();
  return (
    <div className="card r2-prev">
      <div className="between"><b className="h3">{title}</b></div>
      <TeacherCard item={catalogItem(d, t)} to="/tutor/profile/preview" hideFav />
      <span className="small" style={{ textAlign: 'center' }}>{`Цена на карточке уже с 10${NB}% сервиса`}</span>
    </div>
  );
}

export function SavedMark({ t }: { t: TutorProfile }) {
  if (!t.draftSavedAt) return null;
  return <span className="r2-saved"><Icon name="check" />{t.published ? `Сохранено в ${fmtTime(t.draftSavedAt, t.tz)}` : 'Черновик сохранён'}</span>;
}

/* Week grid. Editable grids are painted by dragging: the first cell decides whether we open or close. */
export function WeekGrid({ hours, head, cell, big, onPaint, label = 'Неделя' }: {
  hours: number[]; head: { label: string; day?: number; today?: boolean }[]; cell: (day: number, hour: number) => string; big?: boolean; onPaint?: (cells: [number, number][], on: boolean) => void; label?: string;
}) {
  const drag = useRef<{ on: boolean; cells: Map<string, [number, number]> } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const apply = (el: Element | null) => {
    if (!drag.current || !(el instanceof HTMLElement) || el.dataset.d === undefined) return;
    const dd = Number(el.dataset.d);
    const hh = Number(el.dataset.h);
    const key = `${dd}:${hh}`;
    if (drag.current.cells.has(key)) return;
    drag.current.cells.set(key, [dd, hh]);
    el.classList.toggle('on', drag.current.on);
  };
  useEffect(() => {
    const up = () => {
      if (!drag.current) return;
      const { on, cells } = drag.current;
      drag.current = null;
      onPaint?.([...cells.values()], on);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [onPaint]);
  return (
    <div
      ref={ref}
      className={cx('r2-wk', big && 'big', !onPaint && 'readonly')}
      role="grid"
      aria-label={label}
      onPointerMove={e => drag.current && apply(document.elementFromPoint(e.clientX, e.clientY))}
    >
      <span />
      {head.map((h, i) => <span key={i} className={cx('h', h.today && 'today')}>{h.label}{h.day !== undefined && <b>{h.day}</b>}</span>)}
      {hours.map(h => (
        <Row key={h} h={h}>
          {Array.from({ length: 7 }, (_, d) => (
            <i
              key={d}
              className={cell(d, h) || undefined}
              data-d={d}
              data-h={h}
              role={onPaint ? 'gridcell' : undefined}
              aria-selected={onPaint ? cell(d, h).includes('on') : undefined}
              aria-label={onPaint ? `${DAYS[d]} ${h}:00` : undefined}
              tabIndex={onPaint ? 0 : undefined}
              onPointerDown={onPaint ? e => { e.preventDefault(); (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); drag.current = { on: !cell(d, h).includes('on'), cells: new Map() }; apply(e.currentTarget); } : undefined}
              onKeyDown={onPaint ? e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPaint([[d, h]], !cell(d, h).includes('on')); } } : undefined}
            />
          ))}
        </Row>
      ))}
    </div>
  );
}

function Row({ h, children }: { h: number; children: ReactNode }) {
  return <><span className="t">{`${h}:00`}</span>{children}</>;
}

export function Chance({ label, done, action }: { label: string; done: boolean; action?: ReactNode }) {
  return <div className="between"><span style={{ display: 'flex', gap: 12, alignItems: 'center', fontWeight: 600 }}><span className={cx('r2-ok', !done && 'no')}><Icon name={done ? 'check' : 'plus'} /></span>{nb(label)}</span>{!done && action}</div>;
}
