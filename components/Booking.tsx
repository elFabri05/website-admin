"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { isoDate, weekdayIndex } from "@/lib/dates";
import { useToday } from "@/lib/useToday";
import { HOURS } from "@/lib/hours";
import type { SiteEvent } from "@/lib/types";

/* "Pedir plaza" en un evento rellena el formulario de reserva */
type Handler = (e: SiteEvent) => void;
const BookingContext = createContext<RefObject<Handler | null> | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const handler = useRef<Handler | null>(null);
  return <BookingContext value={handler}>{children}</BookingContext>;
}

export function useBookEvent(): Handler {
  const handler = useContext(BookingContext);
  return (e) => handler?.current?.(e);
}

const TIMES = ["13:30", "14:00", "14:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const PARTY = ["1", "2", "3", "4", "5", "6", "7 o más"];
const fieldNames = { date: "la fecha", name: "tu nombre", email: "tu correo" } as const;

export function BookingForm() {
  const today = useToday();
  const [form, setForm] = useState({ date: "", time: "21:00", party: "2", name: "", email: "", notes: "" });
  const [times, setTimes] = useState(TIMES);
  const [message, setMessage] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const handler = useContext(BookingContext);

  const set = (key: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Por defecto, mañana
  useEffect(() => {
    if (!today) return;
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    setForm((f) => (f.date ? f : { ...f, date: isoDate(tomorrow) }));
  }, [today]);

  useEffect(() => {
    if (!handler) return;
    handler.current = (e) => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimes((ts) => (ts.includes(e.time) ? ts : [...ts, e.time]));
      setForm((f) => {
        const notes = f.notes.includes(e.title) ? f.notes : (f.notes.trim() ? f.notes.trim() + "\n" : "") + "Evento: " + e.title;
        return { ...f, date: e.date, time: e.time, notes };
      });
      document.getElementById("visita")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      setTimeout(() => nameRef.current?.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
    };
    return () => { handler.current = null; };
  }, [handler]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = (Object.keys(fieldNames) as (keyof typeof fieldNames)[]).filter((k) => !form[k].trim());
    if (missing.length) {
      const parts = missing.map((k) => fieldNames[k]);
      setMessage("Añade " + (parts.length > 1 ? parts.slice(0, -1).join(", ") + " y " + parts.at(-1) : parts[0]) + " para que podamos guardarte la mesa.");
      return;
    }
    if (!emailRef.current?.checkValidity()) {
      setMessage("Ese correo parece incompleto. Revísalo e inténtalo de nuevo.");
      return;
    }
    const isEvent = form.notes.includes("Evento:");
    const date = new Date(form.date + "T12:00");
    const [dayName, dayHours] = HOURS[weekdayIndex(date)];
    const when = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    setMessage(!isEvent && dayHours === null
      ? "Los " + dayName.toLowerCase() + " cerramos. Elige otro día y te guardamos la mesa."
      : "¡Gracias, " + form.name + "! Hemos recibido tu solicitud para " + form.party + " el " + when + " a las " + form.time + ". Te la confirmaremos por correo en menos de un día.");
  }

  return (
    <form className="book" noValidate onSubmit={onSubmit}>
      <h3>Guárdanos un sitio</h3>
      <div className="field">
        <label htmlFor="b-date">Fecha</label>
        <input type="date" id="b-date" name="date" required min={today ? isoDate(today) : undefined} value={form.date} onChange={set("date")} />
      </div>
      <div className="field">
        <label htmlFor="b-time">Hora</label>
        <select id="b-time" name="time" value={form.time} onChange={set("time")}>
          {times.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="b-party">Comensales</label>
        <select id="b-party" name="party" value={form.party} onChange={set("party")}>
          {PARTY.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="b-name">Nombre</label>
        <input type="text" id="b-name" name="name" autoComplete="name" required ref={nameRef} value={form.name} onChange={set("name")} />
      </div>
      <div className="field full">
        <label htmlFor="b-email">Correo electrónico</label>
        <input type="email" id="b-email" name="email" autoComplete="email" required ref={emailRef} value={form.email} onChange={set("email")} />
      </div>
      <div className="field full">
        <label htmlFor="b-notes">Alergias o celebraciones</label>
        <textarea id="b-notes" name="notes" placeholder="Uno de nosotros no come cebolla, es nuestro aniversario…" value={form.notes} onChange={set("notes")} />
      </div>
      <button className="btn" type="submit">Solicitar mesa</button>
      <p className="confirm" role="status" hidden={message === null}>{message}</p>
    </form>
  );
}
