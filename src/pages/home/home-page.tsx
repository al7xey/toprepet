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
