"use client";

import type { Scene } from "@/lib/types";
import { Label as LabelChip } from "@/components/Label";

export function SceneTitleBlock({ scene }: { scene: Scene }) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline justify-start gap-4">
      <h1 className="text-xl font-semibold text-foreground">{scene.title}</h1>
      {scene.description ? (
        <p className="text-sm text-muted">{scene.description}</p>
      ) : null}
      {scene.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {scene.labels.map((l) => (
            <LabelChip key={l.id} {...l} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
