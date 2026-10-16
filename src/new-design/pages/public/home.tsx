import { useRef } from 'react';
import { api, staticTutors } from '../../api';
import { useQuery } from '../../api/hooks';
import { PublicLayout } from '../../layout/layouts';
import { rv, useParallax } from '../../reveal';
import { ArrowLink, Button, Faq, Icon, Panel, Section, Steps, Ticks, TutorGrid } from '../../ui';
import { HOW_STEPS, STUDENT_FAQ } from './content';

export default function HomePage() {
  const media = useRef<HTMLDivElement>(null);
  useParallax(media);
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
          <ul className="benefits trh-benefits">
            <li><span className="ic-sq"><Icon name="user" /></span><span>Индивидуальные<br />занятия</span></li>
            <li><span className="ic-sq"><Icon name="cal" /></span><span>Удобный<br />график</span></li>
            <li><span className="ic-sq"><Icon name="chart" /></span><span>Быстрый<br />результат</span></li>
          </ul>
          <div className="trh-hero-btns">
            <Button to="/teachers" size="lg" iconAfter="arrow" className="trh-cta">Найти репетитора</Button>
            <Button to="/me/requests/new" variant="warm" size="lg">Создать заявку</Button>
          </div>
        </div>
        <div className="trh-hero-media" ref={media}>
          <img src="/images/hero-slide-3-1200.webp" alt="Ученица занимается за ноутбуком" width={1200} height={900} fetchPriority="high" />
        </div>
      </section>

      <Section title="Как всё устроено" id="how">
        <Steps items={HOW_STEPS} />
      </Section>

      <Section
        title="Топ репеты"
        lead="Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели."
        action={<ArrowLink to="/teachers" label="Все репетиторы" />}
      >
        <TutorGrid tutors={tutors.data ?? first} layout="row" />
      </Section>

      <Section title="Познакомьтесь до первого занятия" className="trh-intro" lead="Бесплатное знакомство, чтобы обсудить цель, познакомиться с репетитором и понять, как лучше выстроить занятия. Его длительность выбирает сам репетитор.">
        <ol className="g16">
          {([['target', 'Определим цель', 'Разберёмся, с чем нужна помощь.'], ['cal', 'Согласуем формат', 'Обсудим график и удобный темп.'], ['checks', 'Составим план', 'Определим, с чего начать занятия.']] as const).map(([icon, title, text], index) => (
            <li key={title} className="fr" {...rv('up', index * 0.08, { gap: 16 })}>
              <span className="ic-sq"><Icon name={icon} /></span>
              <div className="g4"><b className="u-fs18">{title}</b><span className="muted">{text}</span></div>
            </li>
          ))}
        </ol>
        <div {...rv('up', 0.1)}><Button to="/teachers" size="lg" icon="gift" iconAfter="arrow">Выбрать репетитора</Button></div>
      </Section>

      <section className="trh-trust" aria-labelledby="trust-title">
        <img src="/images/payment-trust.webp" alt="Человек спокойно читает книгу, облокотившись на большой замок" width={1536} height={1024} loading="lazy" {...rv('left')} />
        <div className="trh-sec" {...rv('right', 0.1)}>
          <h2 id="trust-title" className="h2 trh-h2">100% гарантия возврата средств</h2>
          <p className="cap u-fs18">100% возврат оплаты, если оплаченное занятие не было проведено.</p>
          <p className="cap">Деньги не переводятся репетитору сразу: их списывают, когда репетитор подтвердит запись, и выплачивают после проведённого занятия. В других спорных ситуациях поддержка поможет разобраться.</p>
          <div><Button to="/legal/payment-refund/" variant="line">Оплата и возвраты</Button></div>
        </div>
      </section>

      <Panel>
        <div className="trh-sec trh-panel-in">
          <h2 className="trh-panel-h">Записывайтесь сами</h2>
          <Ticks items={['Выбирайте время в расписании репетитора', 'Цена занятия указана в анкете репетитора', 'Деньги заморожены и спишутся после подтверждения', 'Бесплатная отмена за 4 часа до начала']} />
          <div><Button to="/teachers" size="lg">Найти репетитора</Button></div>
        </div>
      </Panel>

      <section className="trk-split" aria-labelledby="help-title" {...rv('up')}>
        <div className="trh-sec u-mw560">
          <h2 id="help-title" className="h2 trh-h2">Нужна помощь?</h2>
          <p className="cap">Ответим на вопросы об оплате, переносах и возвратах в чате поддержки.</p>
        </div>
        <Button to="/help" variant="line" size="lg" icon="chat">Помощь</Button>
      </section>

      <Panel>
        <div className="trh-sec u-start">
          <h2 className="trh-panel-h u-mw600">Вы репетитор? Найдём для вас учеников</h2>
          <Button to="/for-repetitor/" size="lg">Стать топ-репетом</Button>
        </div>
      </Panel>

      <Section title="Вопросы и ответы">
        <Faq items={STUDENT_FAQ} />
      </Section>
    </PublicLayout>
  );
}
