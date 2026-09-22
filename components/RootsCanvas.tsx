"use client";

import { useEffect, useRef } from "react";

type Tip = { x: number; y: number; a: number; width: number; life: number };

/* Raíces que crecen desde el borde superior de la portada */
export function RootsCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    function growRoots() {
      cancelAnimationFrame(frame);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--root").trim();
      ctx.lineCap = "round";

      const tips: Tip[] = [];
      const seeds = Math.max(3, Math.round(w / 220));
      for (let i = 0; i < seeds; i++) {
        tips.push({ x: (w / seeds) * (i + 0.5) + (Math.random() - 0.5) * 60, y: -4, a: Math.PI / 2, width: 3.2, life: h * 1.4 });
      }
      const step = () => {
        for (let n = 0; n < 6; n++) {
          for (let i = tips.length - 1; i >= 0; i--) {
            const t = tips[i];
            const nx = t.x + Math.cos(t.a) * 2.2, ny = t.y + Math.sin(t.a) * 2.2;
            ctx.lineWidth = t.width;
            ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(nx, ny); ctx.stroke();
            t.x = nx; t.y = ny;
            t.a += (Math.random() - 0.5) * 0.28;
            t.a += (Math.PI / 2 - t.a) * 0.02;            // gravitropismo: las raíces bajan
            t.width *= 0.9975; t.life -= 2.2;
            if (Math.random() < 0.014 && t.width > 0.6 && tips.length < 160) {
              tips.push({ x: t.x, y: t.y, a: t.a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6), width: t.width * 0.6, life: t.life * 0.55 });
            }
            if (t.life <= 0 || t.width < 0.3 || t.y > h + 10) tips.splice(i, 1);
          }
        }
        if (tips.length && !reduceMotion) frame = requestAnimationFrame(step);
      };
      if (reduceMotion) { while (tips.length) step(); } else step();
    }

    growRoots();
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;   // ignora la barra del navegador en móvil
      lastWidth = window.innerWidth;
      clearTimeout(resizeTimer); resizeTimer = setTimeout(growRoots, 200);
    };
    window.addEventListener("resize", onResize);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", growRoots);
    const observer = new MutationObserver(growRoots);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      scheme.removeEventListener("change", growRoots);
      observer.disconnect();
    };
  }, []);

  return <canvas id="roots" ref={ref} aria-hidden="true" />;
}
