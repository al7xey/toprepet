import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { lazy, Suspense } from 'react';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
const Faq = lazy(() => import('../../widgets/faq/faq'));
export default function HomePage() {
  return (
    <>
      <Hero />
      <ScrollReveal><Directions /></ScrollReveal>
      <ScrollReveal><Teachers /></ScrollReveal>
      <ScrollReveal><Pricing /></ScrollReveal>
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
