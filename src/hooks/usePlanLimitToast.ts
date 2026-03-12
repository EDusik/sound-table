"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "@/contexts/I18nContext";
import { isPlanLimitError } from "@/lib/planLimits";

/**
 * Returns a handler that detects PlanLimitError instances,
 * shows an upgrade toast, and returns true when the error was
 * a plan limit. Callers can fall back to generic handling when
 * the function returns false.
 *
 * Usage:
 *   const notifyLimit = usePlanLimitToast();
 *   catch (err) { if (!notifyLimit(err)) handleGenericError(err); }
 */
export function usePlanLimitToast() {
  const t = useTranslations();
  const router = useRouter();

  return useCallback(
    (err: unknown): boolean => {
      if (!isPlanLimitError(err)) return false;
      toast.warning(t("limits.upgradeSuggestion"), {
        action: {
          label: "Upgrade",
          onClick: () => router.push("/plans"),
        },
      });
      return true;
    },
    [t, router],
  );
}
