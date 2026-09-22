import { Caveat, Figtree, IBM_Plex_Mono, Shrikhand } from "next/font/google";

const shrikhand = Shrikhand({ weight: "400", subsets: ["latin"], variable: "--font-shrikhand" });
const figtree = Figtree({ weight: ["400", "500", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-figtree" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-plex-mono" });
const caveat = Caveat({ weight: "500", subsets: ["latin"], variable: "--font-caveat" });

export const fontVariables = [shrikhand, figtree, plexMono, caveat].map((f) => f.variable).join(" ");
