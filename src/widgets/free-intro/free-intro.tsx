import { Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FreeIntro() {
  return (
    <section id="free-intro" className="free-intro container" aria-labelledby="free-intro-title">
      <span className="info-icon"><Gift aria-hidden="true" /></span>
      <div className="free-intro-heading">
        <h2 id="free-intro-title">Познакомьтесь до первого занятия</h2>
        <p>20 минут бесплатно: определим цель, согласуем формат и составим план.</p>
      </div>
      <div className="free-intro-actions">
        <Link className="button button-primary free-intro-button" to="/free-intro/">Бесплатное знакомство</Link>
      </div>
    </section>
  );
}
