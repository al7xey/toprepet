import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../components/ui/carousel';
import { teachers } from '../../entities/teacher';

export function Teachers() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isTickerActive, setIsTickerActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || isTickerActive) return;
    if (!('IntersectionObserver' in window)) {
      setIsTickerActive(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsTickerActive(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.2 });

    observer.observe(section);
    return () => observer.disconnect();
  }, [isTickerActive]);

  return (
    <section
      ref={sectionRef}
      className={`section container teachers-section${isTickerActive ? ' teachers-section-ticker-active' : ''}`}
      id="teachers"
      aria-labelledby="teachers-title"
    >
      <Carousel
        className="teachers-carousel"
        tabIndex={0}
        aria-label="Преподаватели"
        opts={{ align: 'start', containScroll: 'trimSnaps' }}
      >
        <div className="section-heading teachers-heading">
          <div>
            <h2 id="teachers-title">Топ репеты</h2>
            <p className="section-caption">
              Молодые преподаватели для занятий в понятном ребёнку темпе.
            </p>
          </div>
          <div className="carousel-controls">
            <CarouselPrevious
              className="carousel-arrow"
              aria-label="Предыдущие преподаватели"
            />
            <CarouselNext
              className="carousel-arrow"
              aria-label="Следующие преподаватели"
            />
          </div>
        </div>
        <CarouselContent className="teacher-track">
          {teachers.map(({ id, role, cardTicker, photo }, index) => (
            <CarouselItem
              className="teacher-slide"
              key={role}
              aria-label={`${index + 1} из ${teachers.length}: ${role}`}
            >
              <Link className="teacher-card" to={`/teacher/${id}`} draggable={false}>
                <span className={`teacher-photo teacher-photo-${index + 1}`}>
                  <img src={photo} alt="" loading="lazy" draggable={false} />
                </span>
                <span className="teacher-glass">
                  <span className="teacher-card-ticker" aria-label={cardTicker.join(', ')}>
                    <span className="teacher-card-ticker-track" aria-hidden="true">
                      {[...cardTicker, ...cardTicker].map((item, tickerIndex) => (
                        <strong key={`${item}-${tickerIndex}`}>{item}</strong>
                      ))}
                    </span>
                  </span>
                  <span className="teacher-open button button-primary">
                    Открыть анкету
                  </span>
                </span>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
