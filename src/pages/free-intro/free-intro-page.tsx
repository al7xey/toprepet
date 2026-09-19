import { LessonPicker } from '../../features/select-lesson';
import { Contact } from '../../widgets/contact/contact';
import { Link } from 'react-router-dom';

const meetingPoints = ['Познакомимся с репетитором', 'Обсудим цель и текущие трудности', 'Определим формат и дальнейший план'];

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
          {meetingPoints.map((text) => <li key={text}><strong>{text}</strong></li>)}
        </ul>
      </section>
    </article>
    <section className="lessons-page free-intro-picker container"><LessonPicker /></section>
    <Contact onLessonsPage />
    </>
  );
}
