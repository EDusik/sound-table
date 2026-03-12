"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/contexts/I18nContext";

const BRAND = "SoundQuest";
const LINK_CLASSES =
  "font-semibold text-primary underline decoration-primary/60 underline-offset-2 transition hover:text-accent hover:decoration-accent dark:text-foreground dark:decoration-(--foreground)/30 dark:hover:text-accent dark:hover:decoration-accent";

function BrandName() {
  return (
    <span className="font-cinzel font-semibold tracking-wide">{BRAND}</span>
  );
}

export function Footer() {
  const t = useTranslations();
  const pathname = usePathname();
  const isPlansPage = pathname === "/plans";

  return (
    <footer
      className="mt-auto min-h-[53px] border-t border-(--foreground)/10 py-4"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-sm text-(--foreground)/70">
        <span className="sm:inline">
          {isPlansPage ? (
            <PlansFooter t={t} />
          ) : (
            <DefaultFooter t={t} />
          )}
        </span>
      </div>
    </footer>
  );
}

function DefaultFooter({ t }: { t: ReturnType<typeof useTranslations> }) {
  const linkRaw = t("footer.plansLink", { brand: BRAND });
  const linkParts = linkRaw.split(BRAND);

  return (
    <>
      {t("footer.plansQuestion")}{" "}
      <Link href="/plans" className={LINK_CLASSES}>
        {linkParts.length === 2 ? (
          <>
            {linkParts[0]}
            <BrandName />
            {linkParts[1]}
          </>
        ) : (
          linkRaw
        )}
      </Link>
      .
    </>
  );
}

function PlansFooter({ t }: { t: ReturnType<typeof useTranslations> }) {
  const intro = t("plans.supportIntro", { brand: BRAND });
  const parts = intro.split(BRAND);

  return (
    <>
      {parts.length === 2 ? (
        <>
          {parts[0]}
          <BrandName />
          {parts[1]}
        </>
      ) : (
        intro
      )}
      <Link href="/support" className={LINK_CLASSES}>
        {t("plans.supportLinkText")}
      </Link>
      .
    </>
  );
}
