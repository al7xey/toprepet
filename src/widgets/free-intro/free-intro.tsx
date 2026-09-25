import { ArrowRight, CalendarDays, Gift, ListChecks, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FreeIntro() {
  return (
    <section className="free-intro container" aria-labelledby="free-intro-title">
      <div className="free-intro-heading">
        <h2 id="free-intro-title">Познакомьтесь до первого занятия</h2>
        <p>20 минут бесплатно, чтобы обсудить цель, познакомиться с репетитором и понять, как лучше выстроить занятия.</p>
      </div>
      <ol className="free-intro-steps">
        <li><Target aria-hidden="true" /><div><strong>Определим цель</strong><span>Разберёмся, с чем нужна помощь.</span></div></li>
        <li><CalendarDays aria-hidden="true" /><div><strong>Согласуем формат</strong><span>Обсудим график и удобный темп.</span></div></li>
        <li><ListChecks aria-hidden="true" /><div><strong>Составим план</strong><span>Определим, с чего начать занятия.</span></div></li>
      </ol>
      <div className="free-intro-actions">
        <Link className="button button-primary free-intro-button" to="/free-intro/"><Gift size={24} aria-hidden="true" /><span>Бесплатное знакомство</span><ArrowRight size={20} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
