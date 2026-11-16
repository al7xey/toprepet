import { api, staticTutors } from '../../api';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { Button, Faq, Icon, IconButton, Section, Steps } from '../../ui';
import { TutorShowcase } from '../../ui/tutor-showcase';
import { HOW_STEPS, STUDENT_FAQ } from './content';
import { publicAssetPath, publicAssetSrcSet } from '../../../shared/lib/public-assets';
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
          <img src={publicAssetPath('/images/hero-slide-3-1200.webp')} srcSet={publicAssetSrcSet('/images/hero-slide-3-640.webp 640w, /images/hero-slide-3-1200.webp 1200w')} sizes="(min-width:1440px) 640px, (min-width:761px) 46vw, calc(100vw - 32px)" alt="Ученица занимается за ноутбуком" width={1200} height={900} fetchPriority="high" />
        </div>
      </section>

      <Section title="Как всё устроено" id="how">
        <Steps items={HOW_STEPS} revealOnScroll />
      </Section>

      <Section
        title="Топ репеты"
        action={<IconButton icon="arrow" label="Все репетиторы" to="/teachers" />}
      >
        <TutorShowcase query={tutors} />
      </Section>

      <Section title="Познакомьтесь до первого занятия" className="trh-intro">
        <ol className="g16">
          {([['target', 'Определим цель', 'Разберёмся, с чем нужна помощь.'], ['cal', 'Согласуем формат', 'Обсудим график и удобный темп.'], ['route', 'Составим план', 'Определим, с чего начать занятия.']] as const).map(([icon, title, text]) => (
            <li key={title} className="fr p-home-intro-step">
              <span className="ic-sq"><Icon name={icon} /></span>
              <div className="g4"><b className="u-fs18">{title}</b><span className="muted">{text}</span></div>
            </li>
          ))}
        </ol>
        <Button to="/teachers?intro=1" size="lg" block>Бесплатное знакомство</Button>
      </Section>

      <Section className="p-home-trust" title="100% гарантия возврата средств">
          <p className="cap">Если оплаченное занятие не состоялось, вернём деньги полностью. Оплата списывается после подтверждения записи, а репетитор получает её после занятия. В спорной ситуации поможет поддержка.</p>
      </Section>

      <Section title="Вы репетитор? Найдём для вас учеников" className="trh-recruit" reveal>
        <Button to="/for-repetitor/" size="lg" block>Стать топ-репетом</Button>
      </Section>

      <Section title="Вопросы и ответы">
        <Faq items={STUDENT_FAQ} />
      </Section>
    </PublicLayout>
  );
}
