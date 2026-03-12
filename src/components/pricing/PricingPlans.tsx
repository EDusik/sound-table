"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Upload, HardDrive, Music, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import {
  PLAN_CONFIG,
  PLAN_IDS,
  formatStorage,
  handleUpgrade,
  type PlanId,
} from "@/lib/plans";
import { useTranslations } from "@/contexts/I18nContext";

type FeatureRowProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
};

function FeatureRow({ icon, children }: FeatureRowProps) {
  return (
    <li className="flex items-center gap-3 text-sm text-foreground/80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function PricingPlans() {
  const t = useTranslations();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const getButtonLabel = useCallback(
    (planId: PlanId) => {
      const planName = t(`pricing.plan.${planId}`);
      if (planId === "noob") return t("pricing.startFree");
      if (planId === "dungeon_master") return t("pricing.becomeDungeonMaster");
      return t("pricing.upgradeTo", { plan: planName });
    },
    [t],
  );

  const onUpgrade = useCallback(
    async (planId: PlanId) => {
      setLoadingPlan(planId);
      try {
        await handleUpgrade(planId, router.push);
      } catch {
        toast.error(t("pricing.checkoutError"));
      } finally {
        setLoadingPlan(null);
      }
    },
    [router, t],
  );

  return (
    <section aria-labelledby="pricing-heading" className="w-full">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("pricing.title")}
          </h2>
          <p className="mt-3 text-muted">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLAN_IDS.map((planId) => {
            const plan = PLAN_CONFIG[planId];
            const planName = t(`pricing.plan.${planId}`);
            const isPopular = planId === "player";
            const isFree = plan.price === 0;
            const isUnlimitedScenes = !Number.isFinite(plan.limits.scenes);
            const isLoading = loadingPlan === planId;
            const isDisabled = loadingPlan !== null;

            return (
              <Card
                key={planId}
                className={[
                  "relative flex flex-col transition-all duration-200 hover:scale-[1.02] hover:border-accent",
                  isPopular
                    ? "border-accent shadow-lg shadow-accent/10 ring-1 ring-accent/30"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-foreground shadow-sm">
                      {t("pricing.mostPopular")}
                    </span>
                  </div>
                )}

                <CardHeader className={isPopular ? "pt-8" : ""}>
                  <CardTitle className="text-xl">
                    <span className="mr-2">{plan.emoji}</span>
                    {planName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isFree ? (
                      <span className="text-3xl font-bold text-foreground">
                        {t("pricing.free")}
                      </span>
                    ) : (
                      <span className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-muted">
                          / {t("pricing.month")}
                        </span>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="flex flex-col gap-4" role="list">
                    <FeatureRow icon={<Layers size={16} />}>
                      {isUnlimitedScenes
                        ? t("pricing.scenesUnlimited")
                        : `${plan.limits.scenes} ${t("pricing.scenes")}`}
                    </FeatureRow>
                    <FeatureRow icon={<Upload size={16} />}>
                      {plan.limits.uploads} {t("pricing.soundUploads")}
                    </FeatureRow>
                    <FeatureRow icon={<Music size={16} />}>
                      {plan.limits.maxFileSizeMB}MB {t("pricing.perAudio")}
                    </FeatureRow>
                    <FeatureRow icon={<HardDrive size={16} />}>
                      {formatStorage(plan.limits.storageMB)}{" "}
                      {t("pricing.storage")}
                    </FeatureRow>
                  </ul>
                </CardContent>

                <CardFooter>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onUpgrade(planId)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-border/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isLoading && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {isLoading ? t("common.loading") : getButtonLabel(planId)}
                  </button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
