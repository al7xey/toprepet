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

function TeacherCard({
  id,
  cardTicker,
  photo,
  index,
}: {
  id: string;
  cardTicker: readonly string[];
  photo: string;
  index: number;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tickerActive, setTickerActive] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || tickerActive) return;
    if (!('IntersectionObserver' in window)) {
      setTickerActive(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.72) {
        setTickerActive(true);
        observer.disconnect();
      }
    }, { threshold: [0.72] });

    observer.observe(card);
    return () => observer.disconnect();
  }, [tickerActive]);

  return (
    <Link
      ref={cardRef}
      className={`teacher-card${tickerActive ? ' teacher-card-ticker-active' : ''}`}
      to={`/teacher/${id}`}
      draggable={false}
    >
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
        <span className="teacher-open button button-primary">Открыть анкету</span>
      </span>
    </Link>
  );
}

export function Teachers() {
  return (
    <section
      className="section container teachers-section"
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
              Сервис помогает найти преподавателя под задачу ребёнка: школьные предметы, домашние задания или подготовку к экзаменам.
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
              <TeacherCard
                id={id}
                cardTicker={cardTicker}
                photo={photo}
                index={index}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
