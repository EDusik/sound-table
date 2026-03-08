import type { Metadata } from "next";

export const siteUrl = "https://sound-table.vercel.app";

const defaultTitle = "Sound Table – Ambient sounds for RPG sessions";
const defaultDescription =
  "Create immersive RPG sessions with ambient sounds, music and sound effects. Build scenes for your tabletop campaigns. Free soundboard for dungeon masters.";

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  title: {
    default: defaultTitle,
    template: "%s | Sound Table",
  },
  description: defaultDescription,
  keywords: [
    "rpg soundboard",
    "tabletop rpg audio",
    "dnd ambient sounds",
    "rpg sound effects",
    "tabletop soundboard",
    "dungeon master soundboard",
    "rpg sound controller",
    "dnd soundboard",
    "ttrpg ambient music",
    "tabletop sound controller",
  ],
  authors: [{ name: "Eduardo Dusik", url: siteUrl }],
  creator: "Eduardo Dusik",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Sound Table",
    title: "Sound Table – Set the mood for every RPG session",
    description:
      "Create immersive tabletop RPG scenes with ambient soundscapes and music. Free soundboard for dungeon masters.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Sound Table – RPG ambient soundboard",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sound Table – RPG Ambient Soundboard",
    description: "Build immersive soundscapes for your tabletop RPG sessions.",
    images: ["/icon.svg"],
  },
  icons: { icon: "/icon.svg" },
  alternates: {
    canonical: siteUrl,
  },
  category: "entertainment",
  other: {
    "mobile-web-app-capable": "yes",
  },
};
