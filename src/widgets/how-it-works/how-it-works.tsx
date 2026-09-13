import { Link } from 'react-router-dom';

const steps = [
  {
    title: 'Выберите задачу',
    text: 'Предмет, домашние задания или подготовка к экзамену.',
    action: 'Напишите менеджеру',
  },
  {
    title: 'Познакомьтесь бесплатно',
    text: 'За 20 минут обсудим цель, график и индивидуальный план.',
  },
  {
    title: 'Занимайтесь по плану',
    text: '60 минут один на один: объяснение, практика и закрепление.',
  },
  {
    title: 'Двигайтесь к цели',
    text: 'Сверяемся с планом и выбираем следующий учебный шаг.',
  },
];

export function HowItWorks() {
  return (
    <section className="section container how-section" id="how" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Как всё устроено</h2>
      </div>
      <ol className="process-grid">
        {steps.map(({ title, text, action }, index) => (
          <li className="process-item" key={title}>
            <span className="process-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div className="process-copy">
              <h3>{title}</h3>
              <p>{text}</p>
              {action && <Link className="process-link" to="/#contact">{action} <span aria-hidden="true">↗</span></Link>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
