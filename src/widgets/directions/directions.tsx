import { Link } from 'react-router-dom';
import { BookOpen, NotebookPen, Shapes, ListChecks } from 'lucide-react';
const formats = [
  {
    id: 'subject',
    icon: BookOpen,
    title: 'Занятия по предметам',
    description: 'Школьная программа и занятия по отдельным темам.',
    label: '1–11 классы',
  },
  {
    id: 'homework',
    icon: NotebookPen,
    title: 'Домашние задания',
    description: 'Выполнение домашних заданий вместе с вашим ребёнком.',
    label: '1–11 классы',
  },
  {
    id: 'exam',
    icon: ListChecks,
    title: 'Подготовка к экзаменам',
    description: 'Занятия по выбранному предмету для ОГЭ или ЕГЭ.',
    label: '9–11 классы',
  },
  {
    id: 'foundation',
    icon: Shapes,
    title: 'Первые годы учёбы',
    description: 'Подготовка к школе и помощь ученикам начальных классов.',
    label: 'До школы · 1–4 классы',
  },
];
export function Directions() {
  return (
    <section
      className="section container"
      id="directions"
      aria-labelledby="formats-title"
    >
      <div className="section-heading">
        <h2 id="formats-title">Что будем изучать?</h2>
        <span className="section-caption">Выберите подходящие занятия</span>
      </div>
      <div className="format-grid">
        {formats.map(({ id, icon: Icon, title, description, label }) => (
          <Link className="format-card" to={'/lessons?goal=' + id} key={id}>
            <div className="format-meta">
              <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="format-action">Выбрать</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
