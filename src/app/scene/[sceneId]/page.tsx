"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getScene,
  getAudios,
  addAudio,
  reorderAudios,
  removeAudio,
  uploadAudioFile,
  AUDIO_UPLOAD_MAX_BYTES,
  isAllowedAudioUrl,
  getAllowedAudioExtension,
  ALLOWED_AUDIO_EXTENSIONS,
} from "@/lib/storage";
import type { Scene, AudioItem } from "@/lib/types";
import { SceneTitleBlock } from "@/components/SceneTitleBlock";
import { SoundTableLogo } from "@/components/SoundTableLogo";
import { AudioRow } from "@/components/AudioRow";
import { FreesoundSearch } from "@/components/FreesoundSearch";
import { useAudioStore } from "@/store/audioStore";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { extractYouTubeId } from "@/lib/youtube";

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

export default function ScenePage() {
  const params = useParams();
  const { user, signOut } = useAuth();
  const sceneId = params.sceneId as string;
  const [scene, setScene] = useState<Scene | null>(null);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFile, setAddFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [audioToDelete, setAudioToDelete] = useState<AudioItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inactiveAudioIds, setInactiveAudioIds] = useState<string[]>([]);
  const [showAddSoundModal, setShowAddSoundModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getScene(sceneId), getAudios(sceneId)])
      .then(([s, a]) => {
        if (!cancelled) {
          setScene(s ?? null);
          setAudios(a);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

  const filteredAudios = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return audios;
    return audios.filter((a) => a.name.toLowerCase().includes(q));
  }, [audios, search]);

  const activeAudios = useMemo(
    () => filteredAudios.filter((a) => !inactiveAudioIds.includes(a.id)),
    [filteredAudios, inactiveAudioIds],
  );

  const inactiveAudios = useMemo(
    () => filteredAudios.filter((a) => inactiveAudioIds.includes(a.id)),
    [filteredAudios, inactiveAudioIds],
  );

  const hasYoutubeInUrl =
    addUrl.trim() !== "" && !!extractYouTubeId(addUrl.trim());
  const hasFileInput = addFile !== null;

  const toggleAudioActive = (audio: AudioItem) => {
    setInactiveAudioIds((prev) =>
      prev.includes(audio.id)
        ? prev.filter((id) => id !== audio.id)
        : [...prev, audio.id],
    );
  };

  const handleAddAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    const urlTrimmed = addUrl.trim();
    if (!name && !addFile) {
      setAddError("Name is required (or choose a file to use its name)");
      return;
    }
    if (!urlTrimmed && !addFile) {
      setAddError(
        `Enter a URL (YouTube or audio ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}) or choose a file`,
      );
      return;
    }
    if (urlTrimmed && !extractYouTubeId(urlTrimmed) && !isAllowedAudioUrl(urlTrimmed)) {
      setAddError(
        `URL must be a YouTube link or an audio file (${ALLOWED_AUDIO_EXTENSIONS.join(", ")}).`,
      );
      return;
    }
    if (addFile && !getAllowedAudioExtension(addFile)) {
      setAddError(
        `Invalid file type. Allowed formats: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}`,
      );
      return;
    }
    if (addFile && addFile.size > AUDIO_UPLOAD_MAX_BYTES) {
      setAddError(`File is too large. Maximum size is ${AUDIO_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`);
      return;
    }
    setAddError(null);
    setAdding(true);
    try {
      if (addFile) {
        const sourceUrl = await uploadAudioFile(sceneId, addFile);
        const displayName = name || addFile.name;
        const audio = await addAudio(sceneId, { name: displayName, sourceUrl, kind: "file" });
        setAudios((prev) => [...prev, audio]);
      } else {
        const youtubeId = extractYouTubeId(urlTrimmed);
        if (youtubeId) {
          let youtubeName = name || "YouTube audio";
          try {
            const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
              watchUrl,
            )}&format=json`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
              const data = (await res.json()) as { title?: string };
              if (data.title) youtubeName = data.title;
            }
          } catch {
            // keep youtubeName
          }
          const audio = await addAudio(sceneId, {
            name: youtubeName,
            sourceUrl: youtubeId,
            kind: "youtube",
          });
          setAudios((prev) => [...prev, audio]);
        } else {
          const audio = await addAudio(sceneId, {
            name,
            sourceUrl: urlTrimmed,
            kind: "file",
          });
          setAudios((prev) => [...prev, audio]);
        }
      }
      setAddName("");
      setAddUrl("");
      setAddFile(null);
      setShowAddSoundModal(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add audio");
    } finally {
      setAdding(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, audioId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, [role='button'], a")) return;
    setDraggedId(audioId);
    e.dataTransfer.setData("audioId", audioId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const audioId = e.dataTransfer.getData("audioId");
    if (!audioId || !draggedId) return;
    const fromIndex = filteredAudios.findIndex((a) => a.id === draggedId);
    if (fromIndex === -1 || fromIndex === toIndex) {
      setDraggedId(null);
      return;
    }
    useAudioStore.getState().stopAll();
    const reordered = [...filteredAudios];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    const rest = audios.filter((a) => !reordered.some((r) => r.id === a.id));
    const newAudios = reordered.map((a, i) => ({ ...a, order: i }));
    const restWithOrder = rest.map((a, i) => ({
      ...a,
      order: reordered.length + i,
    }));
    setAudios([...newAudios, ...restWithOrder]);
    setDraggedId(null);
    setReordering(true);
    try {
      await reorderAudios(sceneId, [
        ...newAudios.map((a) => a.id),
        ...rest.map((a) => a.id),
      ]);
    } finally {
      setReordering(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!audioToDelete) return;
    const id = audioToDelete.id;
    setDeleting(true);
    try {
      const p = useAudioStore.getState().players.get(id);
      if (p?.ref) {
        p.ref.pause();
        p.ref.currentTime = 0;
      }
      useAudioStore.getState().setState(id, "stopped");
      await removeAudio(id);
      setAudios((prev) => prev.filter((a) => a.id !== id));
      setAudioToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = useCallback(() => {
    if (!deleting) setAudioToDelete(null);
  }, [deleting]);

  useEffect(() => {
    if (!audioToDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDeleteModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audioToDelete, closeDeleteModal]);

  useEffect(() => {
    if (!showAddSoundModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddFile(null);
        setShowAddSoundModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddSoundModal]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl rounded-lg bg-red-500/20 p-4 text-red-200">
          {error ?? "Scene not found"}
        </div>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-accent hover:underline"
        >
          ← Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background pb-32">
      {audioToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              Delete sound
            </h2>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                &quot;{audioToDelete.name}&quot;
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-card disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-foreground hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showAddSoundModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-sound-modal-title"
          onClick={() => {
            setAddFile(null);
            setShowAddSoundModal(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="add-sound-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                🔊 Add sound
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAddFile(null);
                  setShowAddSoundModal(false);
                }}
                className="rounded-lg p-1 text-muted hover:bg-card hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  className="h-6 w-6"
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
            <div className="space-y-4">
              <div>
                <FreesoundSearch
                  sceneId={sceneId}
                  onAdded={async () => {
                    const list = await getAudios(sceneId);
                    setAudios(list);
                    setShowAddSoundModal(false);
                  }}
                />
              </div>
              <details className="rounded-lg border border-border bg-card/50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                  🎵 Add audio
                </summary>
                <form
                  onSubmit={handleAddAudio}
                  className="space-y-3 border-t border-border p-4"
                >
                  <div>
                    <label className="block text-xs text-foreground">Name</label>
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-foreground"
                      placeholder="e.g. Rain ambience"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground">
                      URL (YouTube or MP3/WAV/OGG audio) or upload — max. 25 MB
                    </label>
                    <input
                      type="url"
                      value={addUrl}
                      onChange={(e) => {
                        setAddUrl(e.target.value);
                        if (addFile) setAddFile(null);
                      }}
                      disabled={hasFileInput}
                      className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="https://youtube.com/… or https://…/audio.mp3"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Or choose a file on your computer:
                    </p>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
                      disabled={hasYoutubeInUrl}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && !getAllowedAudioExtension(f)) {
                          setAddError(
                            `Format not allowed. Use: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}`,
                          );
                          e.target.value = "";
                          return;
                        }
                        setAddError(null);
                        setAddFile(f ?? null);
                        if (f) setAddUrl("");
                        e.target.value = "";
                      }}
                      className="mt-1 w-full text-sm text-foreground file:mr-2 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {addFile && (
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {addFile.name} ({(addFile.size / 1024 / 1024).toFixed(2)} MB)
                          {addFile.size > AUDIO_UPLOAD_MAX_BYTES && (
                            <span className="text-red-400"> — over 25 MB limit</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddFile(null)}
                          className="text-accent hover:underline"
                        >
                          Remove file
                        </button>
                      </p>
                    )}
                  </div>
                  {addError && (
                    <p className="text-sm text-red-400">{addError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={adding}
                    className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                  >
                    {adding ? "Adding…" : "🎵 Add audio"}
                  </button>
                </form>
              </details>
            </div>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-10 w-full border-b border-border bg-background backdrop-blur">
        <div className="flex w-full items-center">
          <div className="mx-auto flex max-w-6xl flex-1 items-center justify-between gap-2 px-4 py-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xl font-semibold text-foreground hover:opacity-90 transition-opacity"
              aria-label="Back to Dashboard"
            >
              <SoundTableLogo />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-card sm:h-auto sm:w-auto sm:px-2.5 sm:py-2 sm:text-sm"
                aria-label="Sign out"
                title="Sign out"
              >
                <span className="sm:hidden" aria-hidden>
                  <SignOutIcon className="h-5 w-5" />
                </span>
                <span className="hidden sm:inline">Sign out</span>
              </button>
              {user ? (
                <span className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-1.5 py-1.5 sm:px-2.5 sm:py-2 text-sm text-foreground">
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
                  <span className="max-w-[120px] truncate hidden sm:inline">
                    {user.displayName ?? user.email ?? "User"}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 px-4 py-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        <SceneTitleBlock scene={scene} />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-4 bg-background">
        <div className="mb-2 flex items-center justify-end gap-1">
          {searchOpen ? (
            <div className="flex w-full max-w-md flex-1 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by audio name…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
                autoFocus
                aria-label="Filter audios in this scene"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch("");
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
              aria-label="Filter audios"
              title="Filter audios"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddSoundModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-background transition hover:bg-accent-hover"
            aria-label="Add sound"
            title="Add sound"
          >
            +
          </button>
        </div>

        <ul className="space-y-3">
          {filteredAudios.length === 0 && (
            <li className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted">
              {audios.length === 0
                ? "No audios in this scene. Use the + button to add one."
                : "No audios match your search."}
            </li>
          )}
          {activeAudios.map((audio) => (
            <li
              key={audio.id}
              onDragOver={handleDragOver}
              onDrop={(e) =>
                handleDrop(
                  e,
                  filteredAudios.findIndex((a) => a.id === audio.id),
                )
              }
              onDragEnd={handleDragEnd}
              className={`flex items-stretch gap-2 rounded-lg transition-opacity ${
                draggedId === audio.id ? "opacity-50" : ""
              } ${reordering ? "pointer-events-none" : ""}`}
            >
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, audio.id)}
                className="flex cursor-grab active:cursor-grabbing touch-none flex-col justify-center rounded-l-lg border border-border/50 border-r-0 bg-card/60 px-2 text-muted hover:bg-card/60 hover:text-foreground"
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
                <AudioRow
                  audio={audio}
                  sceneId={sceneId}
                  isInactive={false}
                  onToggleActive={toggleAudioActive}
                  onDelete={(a) => setAudioToDelete(a)}
                />
              </div>
            </li>
          ))}
        </ul>

        {inactiveAudios.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-muted">
              Disabled audio
            </h2>
            <ul className="space-y-3">
              {inactiveAudios.map((audio) => (
                <li
                  key={audio.id}
                  className="flex items-stretch gap-2 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <AudioRow
                      audio={audio}
                      sceneId={sceneId}
                      isInactive
                      onToggleActive={toggleAudioActive}
                      onDelete={(a) => setAudioToDelete(a)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
