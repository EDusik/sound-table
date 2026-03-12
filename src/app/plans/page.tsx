"use client";

import { Navbar } from "@/components/layout/Navbar";
import { SoundQuestLogo } from "@/components/branding/SoundQuestLogo";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { useTranslations } from "@/contexts/I18nContext";

export default function PlansPage() {
  const t = useTranslations();

  return (
    <div className="flex flex-col">
      <Navbar
        logo={<SoundQuestLogo size={28} className="text-lg" />}
        logoHref="/dashboard"
        logoAriaLabel={t("brand.name")}
      />
      <PricingPlans />
    </div>
  );
}
