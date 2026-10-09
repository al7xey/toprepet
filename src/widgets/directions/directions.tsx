import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, NotebookPen, Shapes, ListChecks, School } from 'lucide-react';

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
      <div className="section-heading">
        <h2 id="formats-title">Выберите занятия</h2>
      </div>
      <ul className="dir-grid" aria-label="Направления занятий">
        {formats.map(({ id, goal, subject, icon: Icon, title, description, label }) => (
          <li key={id}>
            <Link
              className="dir-card"
              to={`/lessons/?goal=${goal}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`}
              draggable={false}
            >
              <span className="dir-icon">
                <Icon size={26} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="dir-copy">
                <small>{label}</small>
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <ChevronRight className="dir-chevron" size={20} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
