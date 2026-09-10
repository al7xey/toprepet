/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Scrollable regions need keyboard focus (WCAG 2.1.1). */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { directions } from '../../entities/direction/model/directions';
import { DirectionCard } from '../../entities/direction/ui/direction-card';
import {
  DirectionFilter,
  useDirectionGroup,
} from '../../features/filter-directions/ui/direction-filter';
export function Directions() {
  const group = useDirectionGroup();
  const items = directions.filter(
    (d) => group === 'Все направления' || d.group === group,
  );
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ index: 0, end: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: 'instant' });
    const update = () => {
      const card = el.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 1) + 18;
      setPosition({
        index: Math.round(el.scrollLeft / step),
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 5,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [group]);
  const move = (sign: number) => {
    const el = track.current;
    if (el)
      el.scrollBy({
        left: sign * ((el.firstElementChild as HTMLElement).offsetWidth + 18),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  };
  // Keyboard focus on a scrollable region makes the carousel usable without a pointer.
  return (
    <section
      id="directions"
      className="section directions-section"
      aria-labelledby="directions-title"
    >
      <div className="container">
        <div className="section-topline">
          <span className="section-kicker">01 / С ЧЕМ ПОМОЧЬ</span>
          <span className="section-side-note">У каждого свой старт</span>
        </div>
        <div className="section-heading">
          <h2 id="directions-title">
            Ваша задача.
            <br />
            <span>Наше внимание.</span>
          </h2>
          <p>
            Выбирайте то, что важно сейчас.
            <br />
            Стоимость занятия от этого не меняется.
          </p>
        </div>
        <DirectionFilter />
      </div>
      <div className="carousel-shell">
        <section
          className="direction-track"
          ref={track}
          aria-roledescription="карусель"
          tabIndex={0}
          aria-label="Направления занятий — прокручиваемая лента"
        >
          {items.map((direction) => (
            <DirectionCard key={direction.id} direction={direction} />
          ))}
        </section>
      </div>
      <div className="container carousel-footer">
        <span className="carousel-hint">
          Листайте и найдите своё направление{' '}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
        <div className="carousel-controls">
          <span className="carousel-counter" aria-live="polite">
            {String(Math.min(position.index + 1, items.length)).padStart(
              2,
              '0',
            )}
            <span> / {String(items.length).padStart(2, '0')}</span>
          </span>
          <button
            type="button"
            className="round-button"
            disabled={position.index === 0}
            onClick={() => move(-1)}
            aria-label="Предыдущее направление"
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            className="round-button"
            disabled={position.end}
            onClick={() => move(1)}
            aria-label="Следующее направление"
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </section>
  );
}
