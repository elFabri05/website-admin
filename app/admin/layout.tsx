import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "./admin.css";

export const metadata: Metadata = {
  title: "Radicle · Admin",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
