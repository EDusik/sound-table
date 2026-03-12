import { PLAN_CONFIG, type PlanId, type PlanLimits } from "./plans";

/**
 * Returns the current user's plan ID.
 * Defaults to "noob" — will be replaced with Stripe lookup later.
 */
export function getUserPlanId(): PlanId {
  return "noob";
}

export function getUserPlanLimits(): PlanLimits {
  return PLAN_CONFIG[getUserPlanId()].limits;
}

export function getMaxUploadSizeBytes(): number {
  return getUserPlanLimits().maxFileSizeMB * 1024 * 1024;
}

/**
 * Error thrown when a plan limit is exceeded.
 * Carries the i18n key and interpolation params so the UI can
 * translate the message with the correct values (e.g. {max}, {plan}).
 */
export class PlanLimitError extends Error {
  readonly errorKey: string;
  readonly params: Record<string, string | number>;

  constructor(errorKey: string, params: Record<string, string | number> = {}) {
    super(errorKey);
    this.name = "PlanLimitError";
    this.errorKey = errorKey;
    this.params = params;
  }
}

export function isPlanLimitError(err: unknown): err is PlanLimitError {
  return err instanceof PlanLimitError;
}

type LimitCheck =
  | { ok: true }
  | { ok: false; errorKey: string; params: Record<string, string | number> };

function planName(): string {
  return PLAN_CONFIG[getUserPlanId()].name;
}

export function checkSceneLimit(currentCount: number): LimitCheck {
  const { scenes } = getUserPlanLimits();
  if (Number.isFinite(scenes) && currentCount >= scenes) {
    return {
      ok: false,
      errorKey: "limits.sceneLimitReached",
      params: { max: scenes, plan: planName() },
    };
  }
  return { ok: true };
}

export function checkUploadLimit(currentCount: number): LimitCheck {
  const { uploads } = getUserPlanLimits();
  if (currentCount >= uploads) {
    return {
      ok: false,
      errorKey: "limits.uploadLimitReached",
      params: { max: uploads, plan: planName() },
    };
  }
  return { ok: true };
}

export function checkFileSize(fileSizeBytes: number): LimitCheck {
  const limits = getUserPlanLimits();
  const maxBytes = limits.maxFileSizeMB * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    return {
      ok: false,
      errorKey: "limits.fileTooLargeForPlan",
      params: { max: limits.maxFileSizeMB, plan: planName() },
    };
  }
  return { ok: true };
}

export function checkStorageUsage(currentStorageBytes: number, newFileSizeBytes: number): LimitCheck {
  const limits = getUserPlanLimits();
  const maxBytes = limits.storageMB * 1024 * 1024;
  const totalAfter = currentStorageBytes + newFileSizeBytes;
  if (totalAfter > maxBytes) {
    return {
      ok: false,
      errorKey: "limits.storageExceeded",
      params: { max: limits.storageMB, plan: planName() },
    };
  }
  return { ok: true };
}

/**
 * Throws a PlanLimitError when a LimitCheck fails.
 * Call after any check* function for a one-liner guard.
 */
export function enforcePlanLimit(check: LimitCheck): void {
  if (!check.ok) {
    throw new PlanLimitError(check.errorKey, check.params);
  }
}
