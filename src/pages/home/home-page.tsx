import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { lazy, Suspense } from 'react';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
import { Intro } from '../../widgets/intro';
import { Steps } from '../../widgets/steps';
import { ManagerContact } from '../../widgets/manager-contact';
const Faq = lazy(() => import('../../widgets/faq/faq'));
export default function HomePage() {
  return (
    <>
      <Hero />
      <ScrollReveal><Intro /></ScrollReveal>
      <ScrollReveal><Directions /></ScrollReveal>
      <ScrollReveal><Steps /></ScrollReveal>
      <ScrollReveal><ManagerContact /></ScrollReveal>
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
