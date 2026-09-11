import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { lazy, Suspense } from 'react';
const Faq = lazy(() => import('../../widgets/faq/faq'));
export default function HomePage() {
  return (
    <>
      <Hero />
      <Directions />
      <Teachers />
      <Pricing />
      <Suspense
        fallback={
          <output className="loading-block container">Загружаем ответы…</output>
        }
      >
        <Faq />
      </Suspense>
    </>
  );
}
