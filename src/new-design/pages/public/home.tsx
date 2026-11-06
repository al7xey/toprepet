import { api, staticTutors } from '../../api';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { rv } from '../../reveal';
import { Button, Faq, Icon, IconButton, Section, Steps } from '../../ui';
import { TutorShowcase } from '../../ui/tutor-showcase';
import { HOW_STEPS, STUDENT_FAQ } from './content';
import './home-visual.css';

export default function HomePage() {
  const { user } = useSession();
  const first = staticTutors().slice(0, 6);
  const tutors = useQuery('home-tutors', () => api.listTutors({ limit: 6 }).then((p) => p.items), first);

  return (
    <PublicLayout>
      <section className="trh-hero" aria-labelledby="hero-title">
        <div className="trh-hero-text">
          <h1 id="hero-title" className="hero-h trh-hero-h">
            <span className="trh-ln"><span>Топ репет —</span></span>
            <span className="trh-ln trh-ln2"><span className="trh-shine">топ результат</span></span>
          </h1>
          <p className="trh-hero-lead">Индивидуальные занятия с репетиторами онлайн: удобный график и быстрый результат.</p>
          <div className="trh-hero-btns">
            <Button to="/teachers" size="lg" className="trh-cta">Найти репетитора</Button>
            {(!user || user.role === 'student') && <Button to="/me/requests/new" variant="warm" size="lg">Создать заявку</Button>}
          </div>
        </div>
        <div className="trh-hero-media">
          <img src="/images/hero-slide-3-1200.webp" srcSet="/images/hero-slide-3-640.webp 640w, /images/hero-slide-3-1200.webp 1200w" sizes="(min-width:1440px) 640px, (min-width:761px) 46vw, calc(100vw - 32px)" alt="Ученица занимается за ноутбуком" width={1200} height={900} fetchPriority="high" />
        </div>
      </section>

      <Section title="Как всё устроено" id="how">
        <Steps items={HOW_STEPS} />
      </Section>

      <Section
        title="Топ репеты"
        action={<IconButton icon="arrow" label="Все репетиторы" to="/teachers" className="trh-more" />}
      >
        <TutorShowcase query={tutors} />
      </Section>

      <Section title="Познакомьтесь до первого занятия" className="p-home-intro">
        <div className="p-home-intro-layout">
          <figure className="p-home-intro-art" {...rv('left')}>
            <img src="/images/intro-conversation-960.webp" srcSet="/images/intro-conversation-640.webp 640w, /images/intro-conversation-960.webp 960w" sizes="(min-width:1200px) 540px, (min-width:761px) 45vw, calc(100vw - 32px)" alt="Иллюстрация: ученик и преподаватель обсуждают план занятий по видеосвязи" width={960} height={640} loading="lazy" decoding="async" />
            <figcaption>Цель, удобный формат и понятный план</figcaption>
          </figure>
          <div className="trh-sec">
            <ol className="g16">
              {([['target', 'Определим цель', 'Разберёмся, с чем нужна помощь.'], ['cal', 'Согласуем формат', 'Обсудим график и удобный темп.'], ['checks', 'Составим план', 'Определим, с чего начать занятия.']] as const).map(([icon, title, text], index) => (
                <li key={title} className="fr p-home-intro-step" {...rv('up', index * 0.08)}>
                  <span className="ic-sq"><Icon name={icon} /></span>
                  <div className="g4"><b className="u-fs18">{title}</b><span className="muted">{text}</span></div>
                </li>
              ))}
            </ol>
            <div {...rv('up', 0.1)}><Button to="/teachers?intro=1" size="lg">Бесплатное знакомство</Button></div>
          </div>
        </div>
      </Section>

      <Section title="Вопросы и ответы">
        <Faq items={STUDENT_FAQ} />
      </Section>
    </PublicLayout>
  );
}
