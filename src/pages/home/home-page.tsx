import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
import { Contact } from '../../widgets/contact/contact';
import { HowItWorks } from '../../widgets/how-it-works/how-it-works';
import { FreeIntro } from '../../widgets/free-intro/free-intro';
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
        <FreeIntro />
      </ScrollReveal>

      <ScrollReveal>
        <Pricing />
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
