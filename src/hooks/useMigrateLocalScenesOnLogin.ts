"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/I18nContext";
import { migrateLocalDataToSupabase, type MigrationResult } from "@/lib/storage";
import { queryKeys } from "@/hooks/api/queryKeys";

/**
 * Hook that, once the user is authenticated with Supabase, asks the
 * storage layer to migrate any existing localStorage-based scenes and
 * audios into Supabase, respecting plan limits.
 *
 * When items are skipped due to plan limits, a toast prompts the user
 * to upgrade.
 */
export function useMigrateLocalScenesOnLogin() {
  const { user, isAuthenticated, isConfigured, loading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (loading || !isConfigured || !isAuthenticated || !user?.uid) return;

    migrateLocalDataToSupabase(user.uid)
      .then((result: MigrationResult) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.scenes.list(user.uid),
        });

        const hasSkipped = result.scenesSkipped > 0 || result.audiosSkipped > 0;
        if (hasSkipped) {
          toast.warning(
            t("limits.migrationPartialDetail", {
              scenesSkipped: String(result.scenesSkipped),
              audiosSkipped: String(result.audiosSkipped),
            }),
            {
              duration: 10000,
              action: {
                label: "Upgrade",
                onClick: () => router.push("/plans"),
              },
            },
          );
        }
      })
      .catch((err) => {
        console.error("Failed to migrate local scenes to Supabase:", err);
      });
  }, [user, isAuthenticated, isConfigured, loading, queryClient, router, t]);
}
