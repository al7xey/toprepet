import { LessonPicker } from '../../features/select-lesson';
import { Contact } from '../../widgets/contact/contact';
import { CalendarDays, MessageCircle, Route } from 'lucide-react';
import { Link } from 'react-router-dom';

const meetingPoints = [
  [MessageCircle, 'Познакомимся с репетитором'],
  [CalendarDays, 'Обсудим цель и текущие трудности'],
  [Route, 'Определим формат и дальнейший план'],
] as const;

export default function FreeIntroPage() {
  return (
    <>
    <article className="free-intro-page container">
      <Link className="back-link free-intro-back" to="/">На главную</Link>
      <header className="free-intro-hero">
        <h1>Начните со знакомства</h1>
        <p>20 минут бесплатно с репетитором — познакомимся, обсудим вашу цель и определим дальнейший план занятий.</p>
      </header>

      <section className="free-intro-details" aria-labelledby="meeting-plan-title">
        <h2 id="meeting-plan-title">Что успеем за 20 минут</h2>
        <ul>
          {meetingPoints.map(([Icon, text]) => <li key={text}><Icon aria-hidden="true" /><strong>{text}</strong></li>)}
        </ul>
      </section>
    </article>
    <section className="lessons-page free-intro-picker container"><LessonPicker /></section>
    <Contact onLessonsPage />
    </>
  );
}
