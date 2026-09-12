import { CalendarDays, LineChart, MessageCircle } from 'lucide-react';

const steps = [
  {
    icon: MessageCircle,
    number: '01',
    title: 'Бесплатное знакомство',
    text: '20 минут, чтобы познакомиться, обсудить график и цель занятий.',
  },
  {
    icon: CalendarDays,
    number: '02',
    title: 'Регулярные занятия',
    text: 'Выбираем удобный ритм и спокойно разбираем темы шаг за шагом.',
  },
  {
    icon: LineChart,
    number: '03',
    title: 'Прогресс с первого занятия',
    text: 'Сразу фиксируем понятный следующий шаг и отмечаем, что уже получилось.',
  },
];

export function Steps() {
  return (
    <section className="steps-section section container" id="how-it-works" aria-labelledby="steps-title">
      <div className="section-heading steps-heading">
        <div>
          <p className="eyebrow">Как всё проходит</p>
          <h2 id="steps-title">От знакомства к уверенной учёбе.</h2>
        </div>
        <p className="section-caption">Три простых шага без лишней бюрократии.</p>
      </div>
      <div className="steps-grid">
        {steps.map(({ icon: Icon, number, title, text }) => (
          <article className="step-card" key={number}>
            <div className="step-topline">
              <span className="step-number">{number}</span>
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="steps-visual">
        <img src="/images/learning-path.svg" alt="Путь от знакомства к прогрессу" />
      </div>
    </section>
  );
}
