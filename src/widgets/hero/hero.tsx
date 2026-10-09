import { Link, useNavigate } from 'react-router-dom';
import { type SyntheticEvent, useState } from 'react';
import { ArrowRight, Check, Search } from 'lucide-react';
import { HeroCarousel } from './hero-carousel';

export function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    void navigate(term ? `/teachers/?q=${encodeURIComponent(term)}` : '/teachers/');
  }

  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-content">
        <div className="hero-copy">
          <h1 id="hero-title">
            Топ репет —
            <br />
            <span>топ результат</span>
          </h1>
        </div>
        <ul className="hero-benefits">
          <li><Check aria-hidden="true" />Индивидуальные занятия</li>
          <li><Check aria-hidden="true" />Удобный график</li>
          <li><Check aria-hidden="true" />Быстрый результат</li>
        </ul>
        <search className="hero-search-wrap">
        <form className="hero-search" onSubmit={submit}>
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Предмет, тема или репет"
            aria-label="Поиск репетитора"
            autoComplete="off"
          />
          <button type="submit">Найти</button>
        </form>
      </search>
        <div className="hero-offer">
          <Link className="button button-primary" to="/lessons/">
            Подобрать репетитора <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <Link className="button button-light hero-intro" to="/contact/">
            <span>Создать заявку</span>
          </Link>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-art" aria-label="Индивидуальное занятие с репетитором">
          <HeroCarousel />
        </div>
      </div>
    </section>
  );
}
