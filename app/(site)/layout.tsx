import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "./site.css";

export const metadata: Metadata = {
  title: "Radicle Cocina",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
