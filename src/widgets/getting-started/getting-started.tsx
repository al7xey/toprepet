const steps = [
  {
    number: '01',
    title: 'Напишите',
    text: 'Расскажите в Telegram о классе, предмете и вашей задаче.',
  },
  {
    number: '02',
    title: 'Познакомьтесь',
    text: 'Бесплатно обсудите задачу с преподавателем на короткой встрече.',
  },
  {
    number: '03',
    title: 'Начните заниматься',
    text: 'Согласуйте время, формат и план первого занятия.',
  },
];
export function GettingStarted() {
  return (
    <section
      id="start"
      className="section container"
      aria-labelledby="start-title"
    >
      <h2 id="start-title">Как начать</h2>
      <div className="steps-grid">
        {steps.map(({ number, title, text }) => (
          <article className="step" key={number}>
            <div className="step-head">
              <span>{number}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
