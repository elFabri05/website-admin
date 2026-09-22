"use client";

import { useState } from "react";
import { imgSrc } from "@/lib/content";
import type { Dish, Farm } from "@/lib/types";

export function Menu({ menu, farms }: { menu: Record<string, Dish[]>; farms: Record<string, Farm> }) {
  const courses = Object.keys(menu);
  const [course, setCourse] = useState(courses[0]);
  const [veganOnly, setVeganOnly] = useState(false);
  const list = (menu[course] || []).filter((d) => !veganOnly || d.tags.includes("VG"));

  return (
    <>
      <div className="menu-controls">
        <div className="tabs" role="tablist" aria-label="Tipo de plato">
          {courses.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={c === course} onClick={() => setCourse(c)}>{c}</button>
          ))}
        </div>
        <label className="toggle" htmlFor="vegan-only">
          <input type="checkbox" id="vegan-only" checked={veganOnly} onChange={(e) => setVeganOnly(e.target.checked)} /> Solo veganos
        </label>
      </div>
      <ul className="dishes" role="tabpanel">
        {!list.length && (
          <li className="empty">Esta noche no hay nada totalmente vegano en esta sección. Pregúntanos: casi siempre la cocina puede prepararte uno.</li>
        )}
        {list.map((d, i) => {
          const farm = farms[d.f];
          return (
            <li className="dish" key={d.n + i}>
              {d.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="dish-img" src={imgSrc(d.img)} alt={d.alt || ""} loading="lazy" />
              )}
              <h3>{d.n}</h3>
              <span className="price">{d.p} €</span>
              <p>{d.d}</p>
              <div className="dish-meta">
                {farm && <><span className="km">{farm.km} km</span><span>{farm.name}</span></>}
                {d.tags.map((t) => <span key={t} className={"tag " + t.toLowerCase()}>{t}</span>)}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
