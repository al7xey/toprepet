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
          {teachers.map(({ id, role, cardLabel, cardDetail, photo }, index) => (
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
                  <strong>{cardLabel}</strong>
                  <small className="teacher-card-detail">{cardDetail}</small>
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
