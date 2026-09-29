import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../components/ui/carousel';
import { teachers } from '../../entities/teacher';

export function TeacherCard({
  id,
  cardSubjects,
  photo,
  index,
}: {
  id: string;
  cardSubjects: string;
  photo: string;
  index: number;
}) {
  return (
    <Link
      className="teacher-card"
      to={`/teacher/${id}/`}
      aria-label={`Открыть анкету: ${cardSubjects}`}
      draggable={false}
    >
      <span className={`teacher-photo teacher-photo-${index + 1}`}>
        <img src={photo} alt="" loading="eager" draggable={false} />
      </span>
      <span className="teacher-glass">
        <strong className="teacher-card-subjects">{cardSubjects}</strong>
      </span>
    </Link>
  );
}

export function Teachers({ title = 'Топ репеты', caption = 'Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.' }: { title?: string; caption?: string } = {}) {
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
          <h2 id="teachers-title">{title}</h2>
          <Link className="teachers-directory-link" to="/teachers/" aria-label="Смотреть всех преподавателей">
            <ArrowRight size={22} aria-hidden="true" />
          </Link>
          <p className="section-caption">{caption}</p>
        </div>
        <CarouselContent className="teacher-track">
          {teachers.map(({ id, role, cardSubjects, photo }, index) => (
            <CarouselItem
              className="teacher-slide"
              key={role}
              aria-label={`${index + 1} из ${teachers.length}: ${role}`}
            >
              <TeacherCard
                id={id}
                cardSubjects={cardSubjects}
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
