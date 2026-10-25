import { ConsultingSection } from "../components/sections/ConsultingSection";
import { CtaSection } from "../components/sections/CtaSection";
import { HeroSection } from "../components/sections/HeroSection";
import { ProcessSection } from "../components/sections/ProcessSection";
import { ServicesSection } from "../components/sections/ServicesSection";
import { ClientsSection } from "../components/sections/ClientsSection";

import { PageContentProvider } from "../services/pageContent";

export function LandingPage() {
  return (
    <PageContentProvider><main id="main-content" tabIndex={-1}>
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <ConsultingSection />
      <ClientsSection />
      <CtaSection />
    </main></PageContentProvider>
  );
}
