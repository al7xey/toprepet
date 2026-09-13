import { Link } from 'react-router-dom';
import { BookOpen, NotebookPen, Shapes, ListChecks } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../components/ui/carousel';

const formats = [
  {
    id: 'subject',
    icon: BookOpen,
    title: 'Школьные предметы',
    description: 'Разберём тему и закрепим её на практике.',
    label: '1–11 классы',
  },
  {
    id: 'homework',
    icon: NotebookPen,
    title: 'Домашние задания',
    description: 'Выполним вместе, объясняя каждый шаг.',
    label: '1–11 классы',
  },
  {
    id: 'exam',
    icon: ListChecks,
    title: 'ОГЭ и ЕГЭ: информатика',
    description: 'Разберём алгоритмы и задания экзаменационного формата.',
    label: '9–11 классы',
  },
  {
    id: 'foundation',
    icon: Shapes,
    title: 'До школы и 1–4 классы',
    description: 'Подготовка к школе и помощь с начальной программой.',
    label: 'До школы / 1–4 классы',
  },
];
export function Directions() {
  return (
    <section
      className="section container directions-section"
      id="directions"
      aria-labelledby="formats-title"
    >
      <Carousel
        className="formats-carousel"
        tabIndex={0}
        aria-label="Направления занятий"
        opts={{
          align: 'start',
          containScroll: 'trimSnaps',
          breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } },
        }}
      >
        <div className="section-heading">
          <div>
            <h2 id="formats-title">Выберите занятия</h2>
          </div>
          <div className="carousel-controls">
            <CarouselPrevious
              className="carousel-arrow"
              aria-label="Предыдущие занятия"
            />
            <CarouselNext
              className="carousel-arrow"
              aria-label="Следующие занятия"
            />
          </div>
        </div>
        <CarouselContent className="format-track" id="format-slides">
          {formats.map(({ id, icon: Icon, title, description, label }, i) => (
            <CarouselItem
              className="format-slide"
              key={id}
              aria-label={`${i + 1} из ${formats.length}: ${title}`}
            >
              <Link
                className="format-card"
                to={'/lessons?goal=' + id}
                draggable={false}
              >
                <div className="format-meta">
                  <span className="format-icon">
                    <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="format-action">Выбрать</span>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <p className="availability-note">Для ОГЭ и ЕГЭ сейчас доступна только информатика. По другим экзаменационным предметам ищем преподавателей.</p>
    </section>
  );
}
