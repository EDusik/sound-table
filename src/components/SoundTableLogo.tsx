"use client";

import { useTheme } from "@/contexts/ThemeContext";

type SoundTableLogoProps = {
  className?: string;
};

export function SoundTableLogo({ className }: SoundTableLogoProps) {
  const { spinKey } = useTheme();
  return (
    <span className={className}>
      <span
        key={spinKey}
        className="inline-block animate-dice-rotate"
        aria-hidden
      >
        🎲
      </span>
      <span className="hidden sm:inline"> SoundTable</span>
    </span>
  );
}
