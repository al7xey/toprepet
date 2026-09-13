const desktopRoute =
  'M 112 96 C 310 90 330 202 505 230 C 698 262 875 238 882 354 C 890 478 677 469 524 536 C 372 603 262 594 126 650';
const mobileRoute =
  'M 43 72 C 260 115 312 202 305 292 C 296 397 63 411 49 510 C 33 626 254 647 309 716';

function Route({ path, className }: { path: string; className: string }) {
  return (
    <svg
      className={`journey-path ${className}`}
      viewBox={className.includes('mobile') ? '0 0 360 780' : '0 0 1000 720'}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="journey-path-base" d={path} pathLength={1} />
      <path className="journey-path-progress" d={path} pathLength={1} />
      <circle className="journey-runner" r="8">
        <animateMotion dur="4.8s" repeatCount="indefinite" path={path} />
      </circle>
    </svg>
  );
}

const steps = [
  {
    title: 'Знакомство',
    lead: '20 минут бесплатно.',
    text: 'Уточняем цель, график и составляем индивидуальный план.',
  },
  {
    title: 'Занятие',
    lead: '60 минут один на один.',
    text: 'Разбираем тему, практикуемся и закрепляем материал.',
  },
  {
    title: 'Прогресс',
    lead: 'После каждой встречи.',
    text: 'Отмечаем, что получилось и что станет следующим шагом.',
  },
];

export function HowItWorks() {
  return (
    <section className="section container how-section" id="how" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Как проходят занятия</h2>
      </div>
      <div className="journey-route">
        <Route path={desktopRoute} className="journey-path-desktop" />
        <Route path={mobileRoute} className="journey-path-mobile" />
        <ol className="journey-steps">
          {steps.map((step, index) => (
            <li className={`journey-step journey-step-${index + 1}`} key={step.title}>
              <span className="journey-number" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p><strong>{step.lead}</strong> {step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="journey-cycle"><span>занятие</span><span aria-hidden="true">↔</span><span>прогресс</span></p>
      </div>
    </section>
  );
}
