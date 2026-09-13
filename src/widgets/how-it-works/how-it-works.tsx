import { BookOpen, Flag, ListChecks, MessageCircle, type LucideIcon } from 'lucide-react';

const steps: Array<{ title: string; text: string; icon: LucideIcon }> = [
  {
    title: 'Выберите задачу',
    text: 'Предмет, домашние задания или подготовка к экзамену.',
    icon: ListChecks,
  },
  {
    title: 'Познакомьтесь бесплатно',
    text: 'За 20 минут обсудим цель, график и индивидуальный план.',
    icon: MessageCircle,
  },
  {
    title: 'Занимайтесь по плану',
    text: '60 минут один на один: объяснение, практика и закрепление.',
    icon: BookOpen,
  },
  {
    title: 'Двигайтесь к цели',
    text: 'Сверяемся с планом и выбираем следующий учебный шаг.',
    icon: Flag,
  },
];

export function HowItWorks() {
  return (
    <section className="section container how-section" id="how" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Как всё устроено</h2>
      </div>
      <ol className="process-grid">
        {steps.map(({ title, text, icon: Icon }, index) => (
          <li className="process-item" key={title}>
            <span className="process-marker" aria-hidden="true">
              <Icon size={25} strokeWidth={1.9} />
            </span>
            <div className="process-copy">
              <span className="process-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
