"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createRoom } from "@/lib/storage";
import type { Label } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  validateRoomForm,
  TITLE_MAX,
  DESCRIPTION_MAX,
  LABEL_TEXT_MAX,
  LABELS_MAX,
} from "@/lib/roomSchema";

const DEFAULT_COLORS = [
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreateRoomPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelText, setNewLabelText] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const addLabel = () => {
    const t = newLabelText.trim().slice(0, LABEL_TEXT_MAX);
    if (!t) return;
    if (labels.length >= LABELS_MAX) return;
    setLabels((prev) => [
      ...prev,
      { id: generateId(), text: t, color: newLabelColor },
    ]);
    setNewLabelText("");
    setNewLabelColor(DEFAULT_COLORS[0]);
  };

  const removeLabel = (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError(null);
    setFieldErrors({});

    const validation = validateRoomForm({
      title,
      subtitle,
      labels,
    });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom(user.uid, {
        title: validation.data.title,
        subtitle: validation.data.subtitle,
        labels: validation.data.labels,
      });
      router.push(`/room/${room.id}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Falha ao criar a sala.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background">
      <header className="sticky top-0 z-10 w-full border-b border-border bg-background backdrop-blur">
        <div className="flex w-full items-center">
          <div className="mx-auto flex max-w-6xl flex-1 items-center justify-between px-4 py-3">
            <Link
              href="/dashboard"
              className="text-muted hover:text-foreground"
            >
              ← Dashboard
            </Link>
            <h1 className="text-xl font-semibold text-foreground">New Room</h1>
            <div className="flex items-center gap-2">
              {user ? (
                <span className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-1 text-sm text-foreground">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft/50 text-xs font-medium text-accent">
                      {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[120px] truncate">
                    {user.displayName ?? user.email ?? "User"}
                  </span>
                </span>
              ) : (
                <span className="w-20" />
              )}
            </div>
          </div>
          <div className="shrink-0 px-4 py-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 flex-1">
        <form
          onSubmit={handleSubmit}
          className="border-b border-border bg-background/90"
        >
          <div className="mx-auto max-w-6xl px-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted whitespace-nowrap">
                Title
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  maxLength={TITLE_MAX}
                  required
                  className="h-9 w-40 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Room title"
                />
                <span className="text-xs text-muted tabular-nums">
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              {fieldErrors.title && (
                <p className="text-xs text-red-400" role="alert">
                  {fieldErrors.title}
                </p>
              )}

              <span className="text-xs font-medium text-muted whitespace-nowrap">
                Subtitle
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) =>
                    setSubtitle(e.target.value.slice(0, DESCRIPTION_MAX))
                  }
                  maxLength={DESCRIPTION_MAX}
                  className="h-9 w-40 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Optional subtitle"
                />
                <span className="text-xs text-muted tabular-nums">
                  {subtitle.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              {fieldErrors.subtitle && (
                <p className="text-xs text-red-400" role="alert">
                  {fieldErrors.subtitle}
                </p>
              )}

              <div className="flex flex-1 min-w-[260px] items-center gap-2">
                <span className="text-xs font-medium text-muted whitespace-nowrap">
                  Labels ({labels.length}/{LABELS_MAX})
                </span>
                <input
                  type="text"
                  value={newLabelText}
                  onChange={(e) =>
                    setNewLabelText(e.target.value.slice(0, LABEL_TEXT_MAX))
                  }
                  maxLength={LABEL_TEXT_MAX}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addLabel())
                  }
                  className="h-9 w-full min-w-[140px] rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none"
                  placeholder="Label text"
                />
                <span className="text-xs text-muted tabular-nums shrink-0">
                  {newLabelText.length}/{LABEL_TEXT_MAX}
                </span>
                <button
                  type="button"
                  onClick={addLabel}
                  disabled={labels.length >= LABELS_MAX}
                  className="shrink-0 rounded-lg bg-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {(fieldErrors.labels ??
                Object.keys(fieldErrors).some((k) =>
                  k.startsWith("labels."),
                )) && (
                <p className="text-xs text-red-400" role="alert">
                  {fieldErrors.labels ??
                    Object.entries(fieldErrors)
                      .filter(([k]) => k.startsWith("labels."))
                      .map(([, v]) => v)[0]}
                </p>
              )}
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-2 space-y-4">
            <div className="flex flex-wrap gap-4 md:items-end">
              <div className="flex-1 min-w-[260px]">
                <label className="block text-sm font-medium text-foreground">
                  Existing labels ({labels.length}/{LABELS_MAX})
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {labels.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-white"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.text}
                      <button
                        type="button"
                        onClick={() => removeLabel(l.id)}
                        className="ml-1 rounded-full hover:bg-white/20"
                        aria-label={`Remove ${l.text}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex gap-1.5">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className="h-9 w-9 shrink-0 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            newLabelColor === color ? "white" : "transparent",
                          boxShadow:
                            newLabelColor === color
                              ? `0 0 0 1px ${color}`
                              : undefined,
                        }}
                        aria-label={`Color ${color}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addLabel}
                    disabled={labels.length >= LABELS_MAX}
                    className="rounded-lg bg-border px-4 py-2 text-sm text-foreground hover:bg-border/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3">
                {error && (
                  <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-accent py-2 px-4 font-medium text-background transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {loading ? "Creating…" : "Create Room"}
                  </button>
                  <Link
                    href="/dashboard"
                    className="rounded-lg border border-border py-2.5 px-4 text-center text-foreground hover:bg-card"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
