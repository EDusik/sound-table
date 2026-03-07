"use client";

import { useShallow } from "zustand/react/shallow";
import { useAudioStore } from "@/store/audioStore";

function usePlayingList() {
  return useAudioStore(
    useShallow((s) =>
      Array.from(s.players.values()).filter((p) => p.state === "playing"),
    ),
  );
}

export function AudioBar() {
  const playing = usePlayingList();

  if (playing.length === 0) return null;

  const stopAll = () => useAudioStore.getState().stopAll();

  const pause = (id: string) => {
    const p = useAudioStore.getState().players.get(id);
    if (p?.ref) p.ref.pause();
    else p?.youtubeControl?.pause();
  };

  const stop = (id: string) => {
    const p = useAudioStore.getState().players.get(id);
    if (p?.ref) {
      p.ref.pause();
      p.ref.currentTime = 0;
    } else {
      p?.youtubeControl?.stop();
    }
    useAudioStore.getState().setState(id, "stopped");
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 border-t border-border bg-card/95 backdrop-blur"
      role="region"
      aria-label="Now playing"
    >
      <div className="flex w-full flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted">
            Playing ({playing.length})
          </p>
          <button
            type="button"
            onClick={stopAll}
            className="rounded-lg bg-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-border/80"
            title="Stop all songs"
          >
            Stop all
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {playing.map((p) => (
            <div
              key={p.id}
              className="flex w-full items-center gap-3 rounded-lg border-2 border-accent bg-card px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {p.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pause(p.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-foreground hover:bg-accent-hover"
                  title="Pause"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => stop(p.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-border text-foreground hover:bg-border/80"
                  title="Stop"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
