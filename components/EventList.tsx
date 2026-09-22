"use client";

import { imgSrc } from "@/lib/content";
import { isoDate, monthShort } from "@/lib/dates";
import { useToday } from "@/lib/useToday";
import type { SiteEvent } from "@/lib/types";
import { useBookEvent } from "./Booking";

/* buildDate filtra los eventos en el HTML estático; en el navegador se vuelve a filtrar con la fecha real. */
export function EventList({ events, buildDate }: { events: SiteEvent[]; buildDate: string }) {
  const today = useToday();
  const bookEvent = useBookEvent();
  const todayIso = today ? isoDate(today) : buildDate;

  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .map((e) => ({ ...e, when: new Date(e.date + "T" + e.time) }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  if (!upcoming.length) {
    return (
      <>
        <ul className="event-list" />
        <p className="events-note">Ahora mismo no hay nada en el calendario. Escríbenos y te avisamos del próximo.</p>
      </>
    );
  }

  return (
    <>
      <ul className="event-list">
        {upcoming.map((e) => {
          const [state, label] = e.left === 0 ? ["full", "Completo"]
            : e.left <= 4 ? ["few", "Quedan " + e.left + " plazas"]
            : ["open", e.left + " plazas libres"];
          return (
            <li className="event" key={e.date + e.time + e.title}>
              <div className="event-date">
                <span className="d">{e.when.getDate()}</span>
                <span className="m">{monthShort[e.when.getMonth()]}</span>
              </div>
              <h3>{e.title}</h3>
              <button className="btn" type="button" disabled={e.left === 0} onClick={() => bookEvent(e)}>
                {e.left === 0 ? "Completo" : "Pedir plaza"}
              </button>
              <p>{e.text}</p>
              <div className="event-meta">
                <span>{e.when.toLocaleDateString("es-ES", { weekday: "long" })}, {e.time}</span>
                <span className="price">{e.price} € por persona</span>
                <span className={"status " + state}>{label}</span>
              </div>
              {e.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="event-img" src={imgSrc(e.img)} alt={e.alt || ""} loading="lazy" />
              )}
            </li>
          );
        })}
      </ul>
      <p className="events-note">¿Quieres la cocina entera para los tuyos? La cerramos para grupos a partir de 18 personas.</p>
    </>
  );
}
