"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { SoundQuestLogo } from "@/components/branding/SoundQuestLogo";
import { useTranslations } from "@/contexts/I18nContext";

export default function SuccessPage() {
  const t = useTranslations();

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar
        logo={<SoundQuestLogo size={28} className="text-lg" />}
        logoHref="/dashboard"
        logoAriaLabel={t("brand.name")}
      />

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <CheckCircle size={64} className="mb-6 text-accent" />

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("success.title")}
        </h1>
        <p className="mt-3 max-w-md text-muted">
          {t("success.description")}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-border/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {t("success.backToDashboard")}
        </Link>
      </main>
    </div>
  );
}
