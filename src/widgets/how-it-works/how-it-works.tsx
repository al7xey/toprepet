const steps = [
  {
    title: 'Выберите цель',
    text: 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.',
  },
  {
    title: 'Познакомьтесь бесплатно',
    text: 'За 20 минут обсудим цель, график и формат занятий.',
  },
  {
    title: 'Занимайтесь по плану',
    text: 'Репетитор объясняет сложные темы, разбирает задания и помогает закрепить материал.',
  },
  {
    title: 'Двигайтесь дальше',
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
