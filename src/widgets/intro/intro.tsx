import { ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Intro() {
  return (
    <section className="intro-section container" aria-labelledby="intro-title">
      <div className="intro-copy">
        <p className="eyebrow">Занятия под задачу</p>
        <h2 id="intro-title">Понятный план учёбы для вашего ребёнка.</h2>
        <p>
          Сначала разбираемся, что сейчас важно, а затем подбираем темп и формат
          занятий. Можно начать с одного предмета или с домашнего задания.
        </p>
        <ul className="intro-points">
          <li><Check size={19} aria-hidden="true" /> График согласуем заранее</li>
          <li><Check size={19} aria-hidden="true" /> Занятия один на один</li>
          <li><Check size={19} aria-hidden="true" /> План обновляется по прогрессу</li>
        </ul>
        <Link className="text-link" to="/lessons">
          Подобрать формат <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="intro-art">
        <img src="/images/study-scene.svg" alt="Рабочее место для спокойной учёбы" />
      </div>
    </section>
  );
}
