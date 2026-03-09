"use client";

import { useState, useEffect } from "react";

const STORAGE_PREFIX = "focus-entry-seen-";

/**
 * Returns true only the first time the user visits in this session (per key).
 * Used to show the focus ring animation on "New scene" / "Add sound" once per session.
 */
export function useFocusEntryOnce(storageKey: string): boolean {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${STORAGE_PREFIX}${storageKey}`;
    const alreadySeen = sessionStorage.getItem(key);
    if (!alreadySeen) {
      queueMicrotask(() => setShouldAnimate(true));
      sessionStorage.setItem(key, "1");
    }
  }, [storageKey]);

  return shouldAnimate;
}
