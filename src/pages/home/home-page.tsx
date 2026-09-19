import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { lazy, Suspense } from 'react';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
import { Contact } from '../../widgets/contact/contact';
import { HowItWorks } from '../../widgets/how-it-works/how-it-works';
import { FreeIntro } from '../../widgets/free-intro/free-intro';
const Faq = lazy(() => import('../../widgets/faq/faq'));
export default function HomePage() {
  return (
    <>
      <Hero />
      <ScrollReveal><Directions /></ScrollReveal>
      <ScrollReveal><HowItWorks /></ScrollReveal>
      <ScrollReveal><Teachers /></ScrollReveal>
      <ScrollReveal><FreeIntro /></ScrollReveal>
      <ScrollReveal><Pricing /></ScrollReveal>
      <ScrollReveal><Contact /></ScrollReveal>
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
