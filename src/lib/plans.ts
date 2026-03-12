export type PlanId = "noob" | "player" | "dungeon_master";

export type PlanLimits = {
  scenes: number;
  uploads: number;
  maxFileSizeMB: number;
  storageMB: number;
};

export type PlanDefinition = {
  name: string;
  emoji: string;
  price: number;
  limits: PlanLimits;
};

export const PLAN_CONFIG: Record<PlanId, PlanDefinition> = {
  noob: {
    name: "Noob",
    emoji: "🎲",
    price: 0,
    limits: {
      scenes: 4,
      uploads: 5,
      maxFileSizeMB: 3,
      storageMB: 50,
    },
  },
  player: {
    name: "Player",
    emoji: "⚔️",
    price: 2,
    limits: {
      scenes: 8,
      uploads: 50,
      maxFileSizeMB: 10,
      storageMB: 750,
    },
  },
  dungeon_master: {
    name: "Dungeon Master",
    emoji: "🧙‍♂️",
    price: 4,
    limits: {
      scenes: Infinity,
      uploads: 200,
      maxFileSizeMB: 25,
      storageMB: 3072,
    },
  },
};

export const PLAN_IDS = Object.keys(PLAN_CONFIG) as PlanId[];

export function formatStorage(mb: number): string {
  if (mb >= 1024) return `${mb / 1024}GB`;
  return `${mb}MB`;
}

/**
 * Redirects the user to Stripe Checkout for the chosen plan.
 * Calls the server-side API route that creates a Checkout Session.
 * For the free plan it navigates to the dashboard instead.
 */
export async function handleUpgrade(
  planId: PlanId,
  navigate: (path: string) => void,
): Promise<void> {
  if (planId === "noob") {
    navigate("/dashboard");
    return;
  }

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });

  const data = await res.json();

  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Stripe checkout failed");
  }

  window.location.href = data.url;
}
