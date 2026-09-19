import { ArrowRight, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FreeIntro() {
  return (
    <section className="free-intro container" aria-labelledby="free-intro-title">
      <div>
        <Gift aria-hidden="true" />
        <h2 id="free-intro-title">Бесплатное знакомство</h2>
        <p>За 20 минут обсудим цель, график и формат занятий.</p>
      </div>
      <Link className="button button-primary" to="/contact">
        Записаться <ArrowRight size={20} aria-hidden="true" />
      </Link>
    </section>
  );
}
