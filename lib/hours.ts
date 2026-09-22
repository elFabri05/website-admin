/* Horario semanal, empezando en lunes. null = cerrado. */
export const HOURS: [day: string, hours: string | null][] = [
  ["Lunes", null],
  ["Martes", null],
  ["Miércoles", "20:00 – 23:30"],
  ["Jueves", "20:00 – 23:30"],
  ["Viernes", "20:00 – 00:00"],
  ["Sábado", "13:30 – 16:00 · 20:00 – 00:00"],
  ["Domingo", "13:30 – 16:30"],
];
