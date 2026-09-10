import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { GettingStarted } from '../../widgets/getting-started/getting-started';
import { lazy, Suspense } from 'react';
const Faq = lazy(() => import('../../widgets/faq/faq'));
export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="benefit-strip container">
        <span>Любая учебная задача</span>
        <i />
        <span>Одна понятная цена</span>
        <i />
        <span>Внимание к вашему темпу</span>
      </div>
      <Directions />
      <Pricing />
      <GettingStarted />
      <Suspense
        fallback={
          <output className="container loading-block">
            Загружаем ответы на вопросы…
          </output>
        }
      >
        <Faq />
      </Suspense>
    </>
  );
}
