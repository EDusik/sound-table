"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getScenes, reorderScenes, updateScene, deleteScene, createScene } from "@/lib/storage";
import type { Scene, Label } from "@/lib/types";
import { SceneCard } from "@/components/SceneCard";
import { SoundTableLogo } from "@/components/SoundTableLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  validateSceneForm,
  TITLE_MAX,
  DESCRIPTION_MAX,
  LABEL_TEXT_MAX,
  LABELS_MAX,
} from "@/lib/sceneSchema";

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const DEFAULT_COLORS = [
  "#f43f5e",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLabels, setEditLabels] = useState<Label[]>([]);
  const [newLabelText, setNewLabelText] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string>
  >({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingScene, setDeletingScene] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLabels, setCreateLabels] = useState<Label[]>([]);
  const [createNewLabelText, setCreateNewLabelText] = useState("");
  const [createNewLabelColor, setCreateNewLabelColor] = useState(DEFAULT_COLORS[0]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getScenes(user.uid)
      .then((list) => {
        if (!cancelled) setScenes(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load scenes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (editingScene) {
      setEditTitle(editingScene.title);
      setEditDescription(editingScene.description ?? "");
      setEditLabels(editingScene.labels ?? []);
      setNewLabelText("");
      setNewLabelColor(DEFAULT_COLORS[0]);
      setEditError(null);
      setEditFieldErrors({});
    }
  }, [editingScene]);

  useEffect(() => {
    if (!editingScene) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingScene]);

  useEffect(() => {
    if (showCreateModal) {
      setCreateTitle("");
      setCreateDescription("");
      setCreateLabels([]);
      setCreateNewLabelText("");
      setCreateNewLabelColor(DEFAULT_COLORS[0]);
      setCreateError(null);
      setCreateFieldErrors({});
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCreateModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showCreateModal]);

  const openEditModal = (scene: Scene) => {
    setEditingScene(scene);
  };

  const closeEditModal = () => {
    setEditingScene(null);
    setEditError(null);
    setEditFieldErrors({});
    setShowDeleteConfirm(false);
  };

  const handleDeleteScene = async () => {
    if (!editingScene) return;
    setDeletingScene(true);
    try {
      await deleteScene(editingScene.id);
      setScenes((prev) => prev.filter((r) => r.id !== editingScene.id));
      closeEditModal();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to delete scene",
      );
    } finally {
      setDeletingScene(false);
    }
  };

  const addEditLabel = () => {
    const t = newLabelText.trim().slice(0, LABEL_TEXT_MAX);
    if (!t) return;
    if (editLabels.length >= LABELS_MAX) return;
    setEditLabels((prev) => [
      ...prev,
      { id: generateId(), text: t, color: newLabelColor },
    ]);
    setNewLabelText("");
    setNewLabelColor(DEFAULT_COLORS[0]);
  };

  const removeEditLabel = (id: string) => {
    setEditLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const openCreateModal = () => setShowCreateModal(true);
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
    setCreateFieldErrors({});
  };

  const addCreateLabel = () => {
    const t = createNewLabelText.trim().slice(0, LABEL_TEXT_MAX);
    if (!t) return;
    if (createLabels.length >= LABELS_MAX) return;
    setCreateLabels((prev) => [
      ...prev,
      { id: generateId(), text: t, color: createNewLabelColor },
    ]);
    setCreateNewLabelText("");
    setCreateNewLabelColor(DEFAULT_COLORS[0]);
  };

  const removeCreateLabel = (id: string) => {
    setCreateLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid) return;
    setCreateError(null);
    setCreateFieldErrors({});

    const validation = validateSceneForm({
      title: createTitle,
      description: createDescription,
      labels: createLabels,
    });
    if (!validation.success) {
      setCreateFieldErrors(validation.errors);
      return;
    }

    setCreateLoading(true);
    try {
      const scene = await createScene(user.uid, {
        title: validation.data.title,
        description: validation.data.description,
        labels: validation.data.labels,
      });
      setScenes((prev) => [scene, ...prev]);
      closeCreateModal();
      router.push(`/scene/${scene.id}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to create scene.";
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingScene) return;
    setEditError(null);
    setEditFieldErrors({});

    const validation = validateSceneForm({
      title: editTitle,
      description: editDescription,
      labels: editLabels,
    });
    if (!validation.success) {
      setEditFieldErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      const updated: Scene = {
        ...editingScene,
        title: validation.data.title,
        description: validation.data.description,
        labels: validation.data.labels,
      };
      await updateScene(updated);
      setScenes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      closeEditModal();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to save.";
      setEditError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedId(sceneId);
    e.dataTransfer.setData("sceneId", sceneId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredScenes =
    q === ""
      ? scenes
      : scenes.filter((scene) => {
          const matchTitle = scene.title.toLowerCase().includes(q);
          const matchDesc = (scene.description ?? "").toLowerCase().includes(q);
          const matchLabels = (scene.labels ?? []).some((l) =>
            l.text.toLowerCase().includes(q),
          );
          return matchTitle || matchDesc || matchLabels;
        });

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData("sceneId");
    if (!sceneId || !draggedId || !user?.uid) return;
    const fromIndex = scenes.findIndex((r) => r.id === draggedId);
    const toIndexFull =
      q === ""
        ? toIndex
        : scenes.findIndex((r) => r.id === filteredScenes[toIndex]?.id);
    if (fromIndex === -1 || toIndexFull === -1 || fromIndex === toIndexFull) {
      setDraggedId(null);
      return;
    }
    const reordered = [...scenes];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndexFull, 0, removed);
    const newScenes = reordered.map((r, i) => ({ ...r, order: i }));
    setScenes(newScenes);
    setDraggedId(null);
    setReordering(true);
    try {
      await reorderScenes(
        user.uid,
        newScenes.map((r) => r.id),
      );
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="bg-background">
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-scene-title"
        >
          <div
            className="w-full max-w-lg min-w-0 rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleCreateSubmit}>
              <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
                <h2 id="create-scene-title" className="text-lg font-semibold">
                  New scene
                </h2>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg p-1.5 text-muted hover:bg-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="min-w-0 space-y-6 px-5 py-4 text-foreground">
                <div>
                  <label
                    htmlFor="create-title"
                    className="block text-sm font-medium text-foreground"
                  >
                    Title
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="create-title"
                      type="text"
                      value={createTitle}
                      onChange={(e) =>
                        setCreateTitle(e.target.value.slice(0, TITLE_MAX))
                      }
                      maxLength={TITLE_MAX}
                      required
                      className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Scene title"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {createTitle.length}/{TITLE_MAX}
                    </span>
                  </div>
                  {createFieldErrors.title && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {createFieldErrors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="create-description"
                    className="block text-sm font-medium text-foreground"
                  >
                    Description
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="create-description"
                      type="text"
                      value={createDescription}
                      onChange={(e) =>
                        setCreateDescription(
                          e.target.value.slice(0, DESCRIPTION_MAX),
                        )
                      }
                      maxLength={DESCRIPTION_MAX}
                      className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Optional description"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {createDescription.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  {createFieldErrors.description && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {createFieldErrors.description}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-foreground">
                    Labels ({createLabels.length}/{LABELS_MAX})
                  </label>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                    {createLabels.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-3 py-1 text-sm text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        <span className="min-w-0 truncate">{l.text}</span>
                        <button
                          type="button"
                          onClick={() => removeCreateLabel(l.id)}
                          className="shrink-0 rounded-full hover:bg-white/20"
                          aria-label={`Remove ${l.text}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={createNewLabelText}
                      onChange={(e) =>
                        setCreateNewLabelText(e.target.value.slice(0, LABEL_TEXT_MAX))
                      }
                      maxLength={LABEL_TEXT_MAX}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addCreateLabel())
                      }
                      className="h-9 min-w-[140px] flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none"
                      placeholder="Label text"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {createNewLabelText.length}/{LABEL_TEXT_MAX}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCreateNewLabelColor(color)}
                          className="h-6 w-6 shrink-0 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card sm:h-9 sm:w-9"
                          style={{
                            backgroundColor: color,
                            borderColor:
                              createNewLabelColor === color ? "white" : "transparent",
                          }}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addCreateLabel}
                      disabled={createLabels.length >= LABELS_MAX}
                      className="rounded-lg bg-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add label
                    </button>
                  </div>
                  {(createFieldErrors.labels ??
                    Object.keys(createFieldErrors).some((k) =>
                      k.startsWith("labels."),
                    )) && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {createFieldErrors.labels ??
                        Object.entries(createFieldErrors)
                          .filter(([k]) => k.startsWith("labels."))
                          .map(([, v]) => v)[0]}
                    </p>
                  )}
                </div>
                {createError && (
                  <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                    {createError}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50"
                >
                  {createLoading ? "Creating…" : "Create Scene"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-scene-title"
        >
          <div
            className="w-full max-w-lg min-w-0 rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveEdit}>
              <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
                <h2 id="edit-scene-title" className="text-lg font-semibold">
                  Edit scene
                </h2>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg p-1.5 text-muted hover:bg-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="min-w-0 space-y-6 px-5 py-4 text-foreground">
                <div>
                  <label
                    htmlFor="edit-title"
                    className="block text-sm font-medium text-foreground"
                  >
                    Title
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="edit-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(e.target.value.slice(0, TITLE_MAX))
                      }
                      maxLength={TITLE_MAX}
                      required
                      className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Scene title"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {editTitle.length}/{TITLE_MAX}
                    </span>
                  </div>
                  {editFieldErrors.title && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {editFieldErrors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="edit-description"
                    className="block text-sm font-medium text-foreground"
                  >
                    Description
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="edit-description"
                      type="text"
                      value={editDescription}
                      onChange={(e) =>
                        setEditDescription(
                          e.target.value.slice(0, DESCRIPTION_MAX),
                        )
                      }
                      maxLength={DESCRIPTION_MAX}
                      className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Optional description"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {editDescription.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  {editFieldErrors.description && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {editFieldErrors.description}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-foreground">
                    Labels ({editLabels.length}/{LABELS_MAX})
                  </label>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                    {editLabels.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-3 py-1 text-sm text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        <span className="min-w-0 truncate">{l.text}</span>
                        <button
                          type="button"
                          onClick={() => removeEditLabel(l.id)}
                          className="shrink-0 rounded-full hover:bg-white/20"
                          aria-label={`Remove ${l.text}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newLabelText}
                      onChange={(e) =>
                        setNewLabelText(e.target.value.slice(0, LABEL_TEXT_MAX))
                      }
                      maxLength={LABEL_TEXT_MAX}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addEditLabel())
                      }
                      className="h-9 min-w-[140px] flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none"
                      placeholder="Label text"
                    />
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {newLabelText.length}/{LABEL_TEXT_MAX}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className="h-6 w-6 shrink-0 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card sm:h-9 sm:w-9"
                          style={{
                            backgroundColor: color,
                            borderColor:
                              newLabelColor === color ? "white" : "transparent",
                          }}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addEditLabel}
                      disabled={editLabels.length >= LABELS_MAX}
                      className="rounded-lg bg-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add label
                    </button>
                  </div>
                  {(editFieldErrors.labels ??
                    Object.keys(editFieldErrors).some((k) =>
                      k.startsWith("labels."),
                    )) && (
                    <p className="mt-1 text-xs text-red-400" role="alert">
                      {editFieldErrors.labels ??
                        Object.entries(editFieldErrors)
                          .filter(([k]) => k.startsWith("labels."))
                          .map(([, v]) => v)[0]}
                    </p>
                  )}
                </div>
                {editError && (
                  <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                    {editError}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  Delete scene
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-card"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && editingScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-scene-modal-title"
          onClick={() => !deletingScene && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-scene-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              Delete scene
            </h2>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete this scene{" "}
              <strong className="text-foreground">
                &quot;{editingScene.title}&quot;
              </strong>
              ? All audio will be removed and this action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !deletingScene && setShowDeleteConfirm(false)}
                disabled={deletingScene}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-card disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteScene}
                disabled={deletingScene}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-foreground hover:bg-red-500 disabled:opacity-50"
              >
                {deletingScene ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-10 w-full border-b border-border bg-background backdrop-blur">
        <div className="flex w-full items-center">
          <div className="mx-auto flex max-w-6xl flex-1 items-center justify-between px-4 py-4">
            <h1 className="text-xl font-semibold text-foreground">
              <SoundTableLogo />
            </h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-card sm:h-auto sm:w-auto sm:px-3 sm:py-2.5 sm:text-sm"
                aria-label="Sign out"
                title="Sign out"
              >
                <span className="sm:hidden" aria-hidden>
                  <SignOutIcon className="h-5 w-5" />
                </span>
                <span className="hidden sm:inline">Sign out</span>
              </button>

              {user ? (
                <span className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-1.5 py-1.5 sm:px-3 sm:py-1.5 text-sm text-foreground">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft/50 text-xs font-medium text-accent">
                      {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate hidden sm:inline">
                    {user.displayName ?? user.email ?? "User"}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 px-4 py-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 pb-24 bg-background">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-500/20 p-4 text-red-200">
            {error}
          </div>
        )}
        {!loading && !error && scenes.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-muted">No scenes yet.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
            >
              Create your first scene
            </button>
          </div>
        )}
        {!loading && !error && scenes.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-end gap-1">
              {searchOpen ? (
                <div className="flex w-full max-w-md flex-1 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, description or labels…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
                    autoFocus
                    aria-label="Search scenes"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="shrink-0 rounded p-0.5 text-muted hover:text-foreground"
                    aria-label="Close search"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:text-foreground"
                  aria-label="Search scenes"
                  title="Search scenes"
                >
                  <SearchIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-background transition hover:bg-accent-hover"
                aria-label="New scene"
                title="New scene"
              >
                +
              </button>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {filteredScenes.map((scene, index) => (
                <li
                  key={scene.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-stretch gap-2 rounded-xl transition-opacity ${
                    draggedId === scene.id ? "opacity-50" : ""
                  } ${reordering ? "pointer-events-none" : ""}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, scene.id)}
                    className="flex self-stretch cursor-grab active:cursor-grabbing touch-none flex-col justify-center rounded-l-xl border border-border/50 border-r-0 bg-card/50 py-2 pl-2 pr-1 text-muted hover:bg-border/50 hover:text-muted"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <svg
                      className="h-5 w-5 pointer-events-none"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <SceneCard scene={scene} onEdit={openEditModal} />
                  </div>
                </li>
              ))}
            </ul>
            {filteredScenes.length === 0 && q !== "" && (
              <p className="mt-6 text-center text-muted">
                No scenes match &quot;{searchQuery.trim()}&quot;.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
