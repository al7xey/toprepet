import { Link } from 'react-router-dom';

import {
  Button,
  DirectionTiles,
  Icon,
  InfoCard,
  SearchBar,
  SiteHeader,
  StepCards,
  TeacherGrid,
  routes,
} from '../../shared/ui/kit';
import { directions, steps, teacherCards } from './home-data';
import './home-page.css';

const perks = ['Индивидуальные занятия', 'Удобный график', 'Быстрый результат'];
const hero = teacherCards[0];
const topTeachers = teacherCards.slice(0, 4);

/* Главная по макету «Главная» (маршрут 3, экран 3.1): телефон и компьютер. */
export default function HomePage() {
  return (
    <div className="tr tr-home">
      <SiteHeader current="Подобрать репетитора" />

      <div className="tr-home-in">
        <section className="tr-home-hero" aria-labelledby="home-title">
          <div className="tr-home-hero-text">
            <h1 id="home-title">Топ репет —<br />топ результат</h1>
            <ul className="tr-perks">
              {perks.map((perk) => (
                <li key={perk}><Icon name="check" />{perk}</li>
              ))}
            </ul>
            <SearchBar />
            <div className="tr-home-actions">
              <Button variant="primary" to={routes.lessons}>Подобрать репетитора</Button>
              <Button variant="gray" to={routes.newRequest}>Создать заявку</Button>
            </div>
          </div>

          {hero && (
            <Link className="tr-home-photo" to={hero.to} aria-label={`${hero.name}, ${hero.subjects}`}>
              <img src={hero.photo} srcSet={hero.photoSrcSet} sizes="(min-width: 760px) 340px, 100vw" alt="" fetchPriority="high" />
              <span className="tr-home-plate tr-glass" aria-hidden="true">
                <b>{hero.subjects}</b>
                <span>{hero.meta}</span>
              </span>
            </Link>
          )}
        </section>

        <section className="tr-home-sec" aria-labelledby="home-directions">
          <h2 className="tr-h2" id="home-directions">Выберите занятия</h2>
          <DirectionTiles items={directions} label="Направления занятий" />
        </section>

        <section className="tr-home-sec" aria-labelledby="home-top">
          <div className="tr-home-sec-h">
            <h2 className="tr-h2" id="home-top">Топ репеты</h2>
            <Button variant="gray" size="m" circle to={routes.teachers} aria-label="Все репетиторы">
              <Icon name="right" />
            </Button>
          </div>
          <p className="tr-sub tr-home-lead">Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.</p>
          <TeacherGrid teachers={topTeachers} />
        </section>

        <section className="tr-home-sec" aria-labelledby="home-how">
          <h2 className="tr-h2" id="home-how">Как всё устроено</h2>
          <StepCards steps={steps} />
        </section>

        <div className="tr-home-cards">
          <InfoCard
            icon="gift"
            title="Познакомьтесь до первого занятия"
            text="Определим цель · Согласуем формат · Составим план"
            action={<Button variant="tinted" size="m" to={routes.freeIntro}>Бесплатное знакомство</Button>}
          />
          <InfoCard
            icon="shield"
            title="Гарантия возврата средств"
            text="Оплата замораживается при записи и списывается, когда репетитор подтвердит урок. Отменили за 4 часа и раньше, вернём всё. Не подтвердил, заморозка снимется."
          />
          <div className="tr-home-tutor">
            <InfoCard
              icon="user"
              title="Вы репетитор? Найдём для вас учеников"
              text="Анкета за 15 минут, своя цена, выплаты за каждый урок."
              action={<Button variant="gray" size="m" to={routes.forTutors}>Стать топ-репетом</Button>}
              wide
            />
          </div>
        </div>
      </div>
    </div>
  );
}
