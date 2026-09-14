const steps = [
  {
    title: 'Выберите задачу',
    text: 'Определите, какая помощь нужна: занятия по предмету, разбор домашних заданий или подготовка к экзамену.',
  },
  {
    title: 'Познакомьтесь бесплатно',
    text: 'За 20 минут обсудим цель, график и индивидуальный план.',
  },
  {
    title: 'Занимайтесь по плану',
    text: 'На индивидуальном занятии преподаватель объясняет тему, разбирает примеры и помогает закрепить материал.',
  },
  {
    title: 'Двигайтесь к цели',
    text: 'После каждого занятия преподаватель отмечает результат и определяет следующий учебный шаг.',
  },
];

export function HowItWorks() {
  return (
    <section className="section container how-section" id="how" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Как всё устроено</h2>
      </div>
      <ol className="process-grid">
        {steps.map(({ title, text }, index) => (
          <li className="process-item" key={title}>
            <span className="process-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div className="process-copy">
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
