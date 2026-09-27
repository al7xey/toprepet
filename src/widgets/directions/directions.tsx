import { Link } from 'react-router-dom';
import { BookOpen, NotebookPen, Shapes, ListChecks, School } from 'lucide-react';
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
    goal: 'subject',
    icon: BookOpen,
    title: 'Школьные предметы',
    description: 'Разберём тему и закрепим её на практике.',
    label: '1–11 классы',
  },
  {
    id: 'homework',
    goal: 'homework',
    icon: NotebookPen,
    title: 'Домашние задания',
    description: 'Разберём каждое задание и объясним решение по шагам.',
    label: '1–11 классы',
  },
  {
    id: 'exam',
    goal: 'exam',
    icon: ListChecks,
    title: 'ОГЭ и ЕГЭ',
    description: 'Разберём задания и требования экзаменационного формата.',
    label: '8–11 классы',
  },
  {
    id: 'preschool',
    goal: 'foundation',
    subject: 'Подготовка к школе',
    icon: Shapes,
    title: 'Подготовка к школе',
    description: 'Поможем ребёнку освоить навыки, необходимые перед первым классом.',
    label: 'До школы',
  },
  {
    id: 'primary',
    goal: 'foundation',
    subject: 'Начальные классы',
    icon: School,
    title: 'Начальные классы',
    description: 'Разберём школьную программу и укрепим знания по основным предметам.',
    label: '1–4 классы',
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
          {formats.map(({ id, goal, subject, icon: Icon, title, description, label }, i) => (
            <CarouselItem
              className="format-slide"
              key={id}
              aria-label={`${i + 1} из ${formats.length}: ${title}`}
            >
              <Link
                className="format-card"
                to={`/lessons/?goal=${goal}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`}
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
    </section>
  );
}
