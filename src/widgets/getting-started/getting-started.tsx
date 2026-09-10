import { MessageCircle, Users, CalendarDays } from 'lucide-react';
import { ActionLink } from '../../shared/ui/action-link';
const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Расскажите о задаче',
    text: 'Напишите в Telegram: какой класс, предмет и с чем нужна помощь. Можно своими словами.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Познакомьтесь',
    text: 'На бесплатной короткой встрече обсудите задачу с преподавателем и поймёте, комфортно ли вам общаться.',
  },
  {
    number: '03',
    icon: CalendarDays,
    title: 'Договоритесь о занятии',
    text: 'Согласуйте время, формат и план работы. Дальше — к первой теме, шаг за шагом.',
  },
];
export function GettingStarted() {
  return (
    <section
      id="start"
      className="section container"
      aria-labelledby="start-title"
    >
      <div className="section-topline">
        <span className="section-kicker">03 / БЕЗ ЛИШНИХ ШАГОВ</span>
      </div>
      <div className="section-heading">
        <h2 id="start-title">
          Начнём с простого.
          <br />
          <span>С разговора.</span>
        </h2>
        <ActionLink className="button-light">Написать нам</ActionLink>
      </div>
      <div className="steps-grid">
        {steps.map(({ number, icon: Icon, title, text }) => (
          <article className="step" key={number}>
            <div className="step-head">
              <span>{number}</span>
              <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="tutor-note">
        <div className="tutor-placeholder" aria-hidden="true">
          <Users size={27} strokeWidth={1.4} />
        </div>
        <div>
          <h3>А кто будет преподавать?</h3>
          <p>
            Здесь появятся анкеты частных репетиторов. Пока сведения о
            преподавателе и его доступность можно уточнить в переписке.
          </p>
        </div>
        <ActionLink className="button-light">Узнать о репетиторе</ActionLink>
      </div>
    </section>
  );
}
