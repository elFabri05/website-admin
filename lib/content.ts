import site from "@/content/site.json";
import type { SiteContent } from "./types";

export const content = site as SiteContent;

/* Las rutas de imagen en el JSON son relativas a public/ */
export const imgSrc = (path: string) => "/" + path;
