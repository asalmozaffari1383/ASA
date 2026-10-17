import { ConsultingSection } from "../components/sections/ConsultingSection";
import { CtaSection } from "../components/sections/CtaSection";
import { HeroSection } from "../components/sections/HeroSection";
import { ProcessSection } from "../components/sections/ProcessSection";
import { ServicesSection } from "../components/sections/ServicesSection";
import { TrackingConsole } from "../components/sections/TrackingConsole";
import { ClientsSection } from "../components/sections/ClientsSection";

export function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <TrackingConsole />
      <ServicesSection />
      <ProcessSection />
      <ConsultingSection />
      <ClientsSection />
      <CtaSection />
    </main>
  );
}
