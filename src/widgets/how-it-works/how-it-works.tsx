const steps = [
  {
    title: 'Поставьте цель',
    text: 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.',
  },
  {
    title: 'Выберите репетитора',
    text: 'Выберите преподавателя, который подходит вам по предмету, цели и формату занятий.',
  },
  {
    title: 'Познакомьтесь бесплатно',
    text: 'Бесплатные 20 минут на знакомство с репетитором, обсуждение целей, графика и формата занятий.',
  },
  {
    title: 'Занимайтесь по плану',
    text: 'Репетитор объяснит сложные темы, разберёт задания и поможет закрепить материал.',
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
