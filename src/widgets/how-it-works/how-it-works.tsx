const steps = [
  {
    title: 'Поставьте цель',
    text: 'Подтянуть предмет, разобраться с домашними заданиями или подготовиться к экзамену.',
  },
  {
    title: 'Выберите репетитора и время',
    text: 'В анкете видны цена и свободные окна. Запишитесь в удобное время прямо там, без переписки.',
  },
  {
    title: 'Занимайтесь онлайн',
    text: 'Репетитор подтвердит запись и пришлёт ссылку на звонок перед занятием.',
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
