/* Shape of content/site.json, the content edited from /admin. */

export interface Picture {
  img?: string; // relative to public/, e.g. "img/sopa-calabaza.jpg"
  alt?: string;
  w?: number;
  h?: number;
}

export interface Snap extends Picture {
  caption: string;
}

export interface SiteEvent extends Picture {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  text: string;
  price: number;
  left: number;
}

export interface Farm {
  name: string;
  km: number;
}

export interface Dish extends Picture {
  n: string; // nombre
  d: string; // descripción
  p: number; // precio
  f: string; // clave de la granja en farms
  tags: string[]; // "VG", "SG"
}

export interface SiteContent {
  snaps: Snap[];
  events: SiteEvent[];
  farms: Record<string, Farm>;
  menu: Record<string, Dish[]>;
}
