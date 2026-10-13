import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Teachers } from '../../widgets/teachers';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
import { Contact } from '../../widgets/contact/contact';
import { HowItWorks } from '../../widgets/how-it-works/how-it-works';
import Faq from '../../widgets/faq/faq';
import { TutorTeaser } from '../../widgets/tutor-teaser/tutor-teaser';

export default function HomePage() {
  return (
    <>
      <Hero />

      <ScrollReveal>
        <Directions />
      </ScrollReveal>

      <ScrollReveal>
        <HowItWorks />
      </ScrollReveal>

      <ScrollReveal>
        <Teachers />
      </ScrollReveal>

      <ScrollReveal>
        <Contact />
      </ScrollReveal>

      <ScrollReveal>
        <TutorTeaser />
      </ScrollReveal>

      <Faq />
    </>
  );
}
