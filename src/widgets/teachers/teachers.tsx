import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  Code2,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../components/ui/carousel';
import { TELEGRAM_URL } from '../../shared/config/site';

const teachers = [
  {
    icon: Code2,
    role: 'Преподаватель информатики',
    subject: 'Информатика · ОГЭ · ЕГЭ',
    intro:
      'Молодой специалист, который объясняет код и алгоритмы на понятных примерах.',
    achievements: [
      'Анкета и имя преподавателя готовятся',
      'Подтверждённые достижения добавим после согласования',
    ],
  },
  {
    icon: GraduationCap,
    role: 'Преподаватель начальных классов',
    subject: 'Начальные классы · Домашние задания',
    intro: 'Помогает выстроить спокойный ритм учёбы и не бояться новых тем.',
    achievements: [
      'Анкета и имя преподавателя готовятся',
      'Опыт и специализацию укажем после проверки',
    ],
  },
  {
    icon: BadgeCheck,
    role: 'Преподаватель школьных предметов',
    subject: 'Математика · Русский язык · Английский язык',
    intro:
      'Молодой преподаватель для регулярных занятий и разбора сложных тем.',
    achievements: [
      'Анкета и имя преподавателя готовятся',
      'Достижения укажем только с подтверждением',
    ],
  },
] as const;

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
            <h2 id="teachers-title">Молодые преподаватели</h2>
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
          {teachers.map(({ role, subject, intro, achievements }, index) => (
            <CarouselItem
              className="teacher-slide"
              key={role}
              aria-label={`${index + 1} из ${teachers.length}: ${role}`}
            >
              <details className="teacher-card">
                <summary>
                  <span
                    className={`teacher-photo teacher-photo-${index + 1}`}
                    aria-label="Фото преподавателя появится после подтверждения анкеты"
                  >
                    <Camera size={25} strokeWidth={1.7} aria-hidden="true" />
                    <small>Фото готовится</small>
                  </span>
                  <span className="teacher-glass">
                    <span className="teacher-number">0{index + 1}</span>
                    <strong>{role}</strong>
                    <span className="teacher-subject">{subject}</span>
                    <span className="teacher-open button button-primary">
                      Открыть анкету
                    </span>
                  </span>
                </summary>
                <div className="teacher-details">
                  <p>{intro}</p>
                  <h4>Достижения</h4>
                  <ul>
                    {achievements.map((achievement) => (
                      <li key={achievement}>{achievement}</li>
                    ))}
                  </ul>
                  <Link
                    className="button button-secondary teacher-contact"
                    to={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={18} aria-hidden="true" /> Написать в
                    Telegram
                  </Link>
                </div>
              </details>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
