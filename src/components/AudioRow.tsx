"use client";

import { useRef, useEffect, useState } from "react";
import type { AudioItem } from "@/lib/types";
import { useAudioStore } from "@/store/audioStore";

interface AudioRowProps {
  audio: AudioItem;
  roomId: string;
  isInactive?: boolean;
  onToggleActive?: (audio: AudioItem) => void;
  onDelete?: (audio: AudioItem) => void;
}

let youtubeApiPromise: Promise<unknown> | null = null;

function loadYouTubeIframeAPI(): Promise<unknown> {
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const w = window as typeof window & {
      YT?: {
        Player: new (el: HTMLElement, opts: unknown) => unknown;
        PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number };
      };
      onYouTubeIframeAPIReady?: () => void;
    };
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return youtubeApiPromise;
}

function YouTubeAudioRow({
  audio,
  roomId,
  isInactive = false,
  onToggleActive,
  onDelete,
}: AudioRowProps) {
  const videoId = audio.sourceUrl;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const register = useAudioStore((s) => s.register);
  const unregister = useAudioStore((s) => s.unregister);
  const setState = useAudioStore((s) => s.setState);
  const setYoutubeControl = useAudioStore((s) => s.setYoutubeControl);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{
    playVideo: () => void;
    pauseVideo: () => void;
    stopVideo: () => void;
    setVolume: (v: number) => void;
    destroy: () => void;
  } | null>(null);
  const loopRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    register({
      id: audio.id,
      audioId: audio.id,
      roomId,
      name: audio.name,
      sourceUrl: watchUrl,
      youtubeControl: null,
    });
    return () => unregister(audio.id);
  }, [audio.id, audio.name, roomId, watchUrl, register, unregister]);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return;
    loadYouTubeIframeAPI().then((YTLoaded) => {
      const YT = YTLoaded as {
        Player: new (
          el: HTMLElement,
          opts: unknown,
        ) => {
          playVideo: () => void;
          pauseVideo: () => void;
          stopVideo: () => void;
          setVolume: (v: number) => void;
          destroy: () => void;
        };
        PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number };
      } | null;
      if (cancelled || !YT || !containerRef.current) return;
      if (playerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        events: {
          onStateChange: (e: { data: number }) => {
            if (!YT?.PlayerState) return;
            switch (e.data) {
              case YT.PlayerState.PLAYING:
                setIsPlaying(true);
                setState(audio.id, "playing");
                break;
              case YT.PlayerState.PAUSED:
                setIsPlaying(false);
                setState(audio.id, "paused");
                break;
              case YT.PlayerState.ENDED:
                setIsPlaying(false);
                setState(audio.id, "stopped");
                if (loopRef.current && playerRef.current) {
                  playerRef.current.playVideo();
                }
                break;
              default:
                break;
            }
          },
        },
      });
      if (playerRef.current) {
        setYoutubeControl(audio.id, {
          pause: () => playerRef.current?.pauseVideo(),
          stop: () => {
            playerRef.current?.stopVideo();
            setIsPlaying(false);
            setState(audio.id, "stopped");
          },
        });
      }
    });
    return () => {
      cancelled = true;
      setYoutubeControl(audio.id, null);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, audio.id, setState, setYoutubeControl]);

  const handlePlay = () => {
    if (isInactive || !playerRef.current) return;
    playerRef.current.playVideo();
  };

  const handlePause = () => {
    if (isInactive || !playerRef.current) return;
    playerRef.current.pauseVideo();
  };

  const handleStop = () => {
    if (isInactive || !playerRef.current) return;
    playerRef.current.stopVideo();
    setIsPlaying(false);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInactive) return;
    const v = Number(e.target.value);
    setVolume(v);
    if (playerRef.current) {
      playerRef.current.setVolume(v * 100);
    }
  };

  const handleLoop = () => {
    if (isInactive) return;
    setLoop((prev) => !prev);
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-card/50 p-4 sm:flex-row sm:items-start sm:gap-4 ${
        isPlaying ? "border-2 border-accent" : "border-border/50"
      }`}
    >
      <div className="flex items-start gap-3 sm:flex-1">
        <label className="mt-1 flex items-center">
          <input
            type="checkbox"
            checked={!isInactive}
            onChange={() => onToggleActive?.(audio)}
            className="h-4 w-4 cursor-pointer accent-accent"
            aria-label={isInactive ? "Re-enable audio" : "Disable audio"}
          />
        </label>
        <div
          className={`min-w-0 flex-1 ${isInactive ? "opacity-40" : ""}`}
          aria-hidden={isInactive}
        >
          <p className="truncate font-medium text-foreground">{audio.name}</p>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-xs text-accent hover:underline"
          >
            {watchUrl}
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 ${isInactive ? "opacity-40 pointer-events-none" : ""}`}
          >
            {!isPlaying ? (
              <button
                type="button"
                onClick={handlePlay}
                className="rounded-lg bg-accent p-2 text-background hover:bg-accent-hover"
                title="Play"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="rounded-lg bg-accent p-2 text-background hover:bg-accent-hover"
                title="Pause"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handleStop}
              className="rounded-lg bg-border p-2 text-foreground hover:bg-border/80"
              title="Stop"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleLoop}
              title={loop ? "Loop on" : "Loop off"}
              className={`rounded p-1.5 text-xs ${
                loop
                  ? "bg-accent-soft/50 text-accent"
                  : "text-muted hover:bg-border"
              }`}
            >
              Loop
            </button>
          </div>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(audio)}
              className="rounded-lg p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              title="Delete sound"
              aria-label="Delete sound"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          ) : null}
        </div>
        <label
          className={`flex w-full items-center gap-1 text-xs text-muted sm:w-auto ${isInactive ? "opacity-40 pointer-events-none" : ""}`}
        >
          <span>Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            className="w-20 flex-1 min-w-0 sm:flex-initial"
          />
        </label>
      </div>
      <div className="hidden">
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function HtmlAudioRow({
  audio,
  roomId,
  isInactive = false,
  onToggleActive,
  onDelete,
}: AudioRowProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const register = useAudioStore((s) => s.register);
  const unregister = useAudioStore((s) => s.unregister);
  const setState = useAudioStore((s) => s.setState);
  const setRef = useAudioStore((s) => s.setRef);
  const setVolume = useAudioStore((s) => s.setVolume);
  const setLoop = useAudioStore((s) => s.setLoop);
  const player = useAudioStore((s) => s.players.get(audio.id));

  useEffect(() => {
    register({
      id: audio.id,
      audioId: audio.id,
      roomId,
      name: audio.name,
      sourceUrl: audio.sourceUrl,
    });
    return () => unregister(audio.id);
  }, [audio.id, audio.name, audio.sourceUrl, roomId, register, unregister]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnded = () => setState(audio.id, "stopped");
    const onPlay = () => setState(audio.id, "playing");
    const onPause = () => setState(audio.id, "paused");
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [audio.id, setState]);

  const handlePlay = () => {
    if (isInactive) return;
    ref.current?.play();
  };
  const handlePause = () => {
    if (isInactive) return;
    ref.current?.pause();
  };
  const handleStop = () => {
    if (isInactive) return;
    if (!ref.current) return;
    ref.current.pause();
    ref.current.currentTime = 0;
    setState(audio.id, "stopped");
  };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInactive) return;
    const v = Number(e.target.value);
    if (ref.current) ref.current.volume = v;
    setVolume(audio.id, v);
  };
  const handleLoop = () => {
    if (isInactive) return;
    const el = ref.current;
    if (!el) return;
    const next = !player?.loop;
    el.loop = next;
    setLoop(audio.id, next);
  };

  const isPlaying = player?.state === "playing";
  const volume = player?.volume ?? 1;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-card/50 p-4 sm:flex-row sm:items-center sm:gap-4 ${
        isPlaying ? "border-2 border-accent" : "border-border/50"
      }`}
    >
      <audio
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLAudioElement | null>).current = el;
          if (el) setRef(audio.id, el);
        }}
        src={audio.sourceUrl}
        preload="metadata"
        loop={player?.loop ?? false}
        className="hidden"
      />
      <div className="flex items-start gap-3 sm:flex-1">
        <label className="mt-1 flex items-center">
          <input
            type="checkbox"
            checked={!isInactive}
            onChange={() => onToggleActive?.(audio)}
            className="h-4 w-4 cursor-pointer accent-accent"
            aria-label={isInactive ? "Re-enable audio" : "Disable audio"}
          />
        </label>
        <div
          className={`min-w-0 flex-1 ${isInactive ? "opacity-40" : ""}`}
          aria-hidden={isInactive}
        >
          <p className="truncate font-medium text-foreground">{audio.name}</p>
          <p className="truncate text-xs text-muted">{audio.sourceUrl}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 ${isInactive ? "opacity-40 pointer-events-none" : ""}`}
          >
            {!isPlaying ? (
              <button
                type="button"
                onClick={handlePlay}
                className="rounded-lg bg-accent p-2 text-background hover:bg-accent-hover"
                title="Play"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="rounded-lg bg-accent p-2 text-background hover:bg-accent-hover"
                title="Pause"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={handleStop}
              className="rounded-lg bg-border p-2 text-foreground hover:bg-border/80"
              title="Stop"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleLoop}
              title={player?.loop ? "Loop on" : "Loop off"}
              className={`rounded p-1.5 text-xs ${player?.loop ? "bg-accent-soft/50 text-accent" : "text-muted hover:bg-border"}`}
            >
              Loop
            </button>
          </div>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(audio)}
              className="rounded-lg p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              title="Delete sound"
              aria-label="Delete sound"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          ) : null}
        </div>
        <label
          className={`flex w-full items-center gap-1 text-xs text-muted sm:w-auto ${isInactive ? "opacity-40 pointer-events-none" : ""}`}
        >
          <span>Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
            className="w-20 flex-1 min-w-0 sm:flex-initial"
          />
        </label>
      </div>
    </div>
  );
}

export function AudioRow(props: AudioRowProps) {
  if (props.audio.kind === "youtube") {
    return <YouTubeAudioRow {...props} />;
  }
  return <HtmlAudioRow {...props} />;
}
