import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HeroSection } from "@/components/marketing/HeroSection";
import { FeaturesGrid } from "@/components/marketing/FeaturesGrid";
import { PricingPreview } from "@/components/marketing/PricingPreview";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <>
      <MarketingHeader />
      <HeroSection />
      <FeaturesGrid />
      <PricingPreview />
      <Footer />
    </>
  );
}







