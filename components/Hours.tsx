"use client";

import { weekdayIndex } from "@/lib/dates";
import { useToday } from "@/lib/useToday";
import { HOURS } from "@/lib/hours";

export function Hours() {
  const today = useToday();
  const todayIdx = today ? weekdayIndex(today) : -1;

  return (
    <table className="hours" aria-label="Horario">
      <tbody>
        {HOURS.map(([day, t], i) => (
          <tr key={day} className={i === todayIdx ? "today" : undefined}>
            <td>{day}{i === todayIdx && " (hoy)"}</td>
            <td className={t ? undefined : "closed"}>{t || "Cerrado, estamos en la huerta"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
