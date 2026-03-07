"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const FAVICON_LIGHT = "/icon.svg";
const FAVICON_DARK = "/icon-dark.svg";

export function ThemeFavicon() {
  const { dark } = useTheme();

  useEffect(() => {
    const link =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? createFaviconLink();
    link.href = dark ? FAVICON_DARK : FAVICON_LIGHT;
  }, [dark]);

  return null;
}

function createFaviconLink(): HTMLLinkElement {
  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  return link;
}
