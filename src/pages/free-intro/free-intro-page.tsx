import { ArrowLeft, ArrowRight, CalendarDays, MessageCircle, Route } from 'lucide-react';
import { Link } from 'react-router-dom';

const meetingPoints = [
  [MessageCircle, 'Познакомимся с репетитором'],
  [CalendarDays, 'Обсудим цель и текущие трудности'],
  [Route, 'Определим формат и дальнейший план'],
] as const;

export default function FreeIntroPage() {
  return (
    <article className="free-intro-page container">
      <Link className="inline-link free-intro-back" to="/"><ArrowLeft size={18} aria-hidden="true" />Вернуться на главную</Link>
      <header className="free-intro-hero">
        <p className="free-intro-kicker">Бесплатно · 20 минут</p>
        <h1>Начните со знакомства</h1>
        <p>20 минут бесплатно с репетитором — познакомимся, обсудим вашу цель и определим дальнейший план занятий.</p>
        <Link className="button button-primary" to="/contact">Записаться <ArrowRight size={20} aria-hidden="true" /></Link>
      </header>

      <section className="free-intro-details" aria-labelledby="meeting-plan-title">
        <h2 id="meeting-plan-title">Что успеем за 20 минут</h2>
        <ul>
          {meetingPoints.map(([Icon, text]) => <li key={text}><Icon aria-hidden="true" /><span>{text}</span></li>)}
        </ul>
      </section>

      <section className="free-intro-after" aria-labelledby="after-title">
        <div>
          <h2 id="after-title">После знакомства</h2>
          <p>Если всё подходит, выберем удобное время и начнём индивидуальные занятия.</p>
        </div>
        <Link className="button button-primary" to="/contact">Записаться <ArrowRight size={20} aria-hidden="true" /></Link>
      </section>
    </article>
  );
}
