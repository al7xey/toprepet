import { useState } from 'react';
import { api, staticTutors, studentPriceOf } from '../../api';
import { useQuery } from '../../api/hooks';
import { PublicLayout } from '../../layout/layouts';
import { rub } from '../../lib/format';
import { rv } from '../../reveal';
import { Button, Faq, Panel, Section, Steps, Ticks, TutorGrid } from '../../ui';
import { TUTOR_FAQ, TUTOR_STEPS } from './content';

/** Калькулятор: репетитор получает свою цену, ученик платит на 10% больше. */
function PriceCalc() {
  const [price, setPrice] = useState(2000);
  const student = studentPriceOf(price);
  return (
    <div className="card trk-card pad-md trk-calc" {...rv('right', 0.1)}>
      <span className="muted md">Пример для одного занятия</span>
      <label className="trk-calc-row">
        <span className="muted">Вы назначаете цену</span>
        <b className="tn trk-calc-price">{rub(price)}</b>
      </label>
      <input type="range" min={800} max={5000} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label="Цена занятия" className="trk-range" />
      <div className="trk-calc-bar" aria-hidden="true"><i /><i /></div>
      <div className="fr fb md"><span><b className="acc">■</b> Вы получаете</span><b className="tn">{rub(price)}</b></div>
      <div className="fr fb md"><span><b className="u-peach">■</b> <span className="muted">Сервисный сбор, 10%</span></span><b className="tn">+{rub(student - price)}</b></div>
      <div className="fr fb trk-calc-total"><span>Ученик заплатит</span><b className="tn">{rub(student)}</b></div>
    </div>
  );
}

export default function TutorsLandingPage() {
  const first = staticTutors().slice(0, 6);
  const tutors = useQuery('tutors-landing', () => api.listTutors({ limit: 6 }).then((p) => p.items), first);
  return (
    <PublicLayout>
      <section className="trh-hero" aria-labelledby="hero-title">
        <div className="trh-hero-text">
          <h1 id="hero-title" className="hero-h trh-hero-h">
            <span className="trh-ln"><span>Вы преподаёте.</span></span>
            <span className="trh-ln trh-ln2"><span className="trh-shine">Мы находим учеников.</span></span>
          </h1>
          <p className="trh-hero-lead">TopRepet показывает вашу анкету ученикам, принимает записи и оплату, напоминает об уроках и переводит выплаты.</p>
          <div className="trh-hero-btns">
            <Button to="/signup?role=tutor" size="lg" className="trh-cta">Создать анкету</Button>
            <Button to="/requests" variant="warm" size="lg">Заявки учеников</Button>
          </div>
        </div>
        <div className="trh-hero-media">
          <img src="/images/for-repetitor-hero-1200.webp" alt="Репетиторы TopRepet" width={1200} height={900} fetchPriority="high" />
        </div>
      </section>

      <section className="trk-split trk-price" aria-labelledby="price-title">
        <div className="trh-sec" {...rv('up', 0, { flex: '1 1 420px', minWidth: 0 })}>
          <h2 id="price-title" className="h2 trh-h2">Вы берёте столько, сколько напишете</h2>
          <p className="cap u-fs18">Назначьте цену занятия сами. Мы добавим 10% сервиса сверху: ученик заплатит чуть больше, а вы получите ровно свою цену.</p>
          <Ticks items={['Всего 10% комиссии, и её платит ученик', 'В анкете сразу видно, сколько заплатит ученик', 'Выплата после занятия, в течение 24 часов']} />
        </div>
        <div className="trk-calc-wrap"><PriceCalc /></div>
      </section>

      <Section title="Как начать"><Steps items={TUTOR_STEPS} /></Section>

      <Panel>
        <div className="trk-split">
          <div className="trh-sec u-mw560">
            <h2 className="trh-panel-h">Заявки учеников</h2>
            <p className="muted">Смотрите, чего ищут ученики, и откликайтесь на подходящие заявки. Откликнуться можно после входа.</p>
          </div>
          <Button to="/requests" size="lg">Смотреть заявки</Button>
        </div>
      </Panel>

      <Section title="Они уже с TopRepet"><TutorGrid tutors={tutors.data ?? first} layout="row" /></Section>

      <Panel>
        <div className="trh-sec u-start">
          <h2 className="trh-panel-h u-mw620">Хотите получать учеников через TopRepet?</h2>
          <p className="muted u-mw560">Создайте анкету за 15 минут, назначьте цену и откройте расписание. Записи подтверждаете сами. Для выплат понадобится статус самозанятого.</p>
          <Button to="/signup?role=tutor" size="lg">Создать анкету</Button>
        </div>
      </Panel>

      <Section title="Вопросы и ответы"><Faq items={TUTOR_FAQ} /></Section>
    </PublicLayout>
  );
}
