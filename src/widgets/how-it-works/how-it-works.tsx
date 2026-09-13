const steps = [
  {
    title: 'Знакомство',
    lead: '20 минут бесплатно',
    text: 'Уточняем цель, удобный график и составляем индивидуальный план.',
  },
  {
    title: 'Занятия по плану',
    lead: '60 минут один на один',
    text: 'Разбираем нужные темы, практикуемся и закрепляем материал.',
  },
  {
    title: 'Достижение цели',
    lead: 'Сверяемся с планом',
    text: 'Отмечаем освоенные темы и определяем следующий этап занятий.',
  },
];

export function HowItWorks() {
  return (
    <section className="section container how-section" id="how" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Как начинаются занятия</h2>
      </div>
      <ol className="journey-list">
        {steps.map((step, index) => (
          <li className="journey-item" key={step.title}>
            <span className="journey-number" aria-hidden="true">{index + 1}</span>
            <div className="journey-copy">
              <h3>{step.title}</h3>
              <p><strong>{step.lead}</strong><br />{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
