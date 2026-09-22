import { Hero } from '../../widgets/hero/hero';
import { Directions } from '../../widgets/directions/directions';
import { Pricing } from '../../widgets/pricing/pricing';
import { Teachers } from '../../widgets/teachers';
import { ScrollReveal } from '../../shared/ui/scroll-reveal';
import { Contact } from '../../widgets/contact/contact';
import { HowItWorks } from '../../widgets/how-it-works/how-it-works';
import { FreeIntro } from '../../widgets/free-intro/free-intro';
import { useScrollToSection } from '../../shared/lib/use-scroll-to-section';
import Faq from '../../widgets/faq/faq';

export default function HomePage() {
  useScrollToSection();

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

      <Faq />
    </>
  );
}
