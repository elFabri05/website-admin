"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Dish, Picture, SiteContent } from "@/lib/types";
import { b64, decryptToken, encryptToken, utf8ToB64, type Credentials } from "./crypto";
import { BRANCH, OWNER, REPO, errorMessage, errorStatus, gh } from "./github";

/* ---------- Configuración ---------- */
const CONTENT_FILE = "content/site.json";
const PUBLIC_DIR = "public/";                         // las rutas img/... del JSON viven en public/
const CRED_FILE = PUBLIC_DIR + "admin/credentials.json";
const CRED_URL = "/admin/credentials.json";
const MAX_IMAGE_SIDE = 1600;

const serialize = (data: SiteContent) => JSON.stringify(data, null, 2) + "\n";

type View = "loading" | "setup" | "login" | "app";
type Tab = "events" | "menu" | "snaps";
type Msg = { text: string; ok?: boolean } | null;

/* ---------- Imágenes ---------- */
const slug = (t?: string) => (t || "imagen").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "imagen";

class ImageStore {
  pending = new Map<string, Blob>();   // ruta img/... -> imagen nueva aún sin subir
  previews = new Map<string, string>(); // ruta -> objectURL, para ver imágenes recién subidas antes del despliegue

  async prepare(file: File, name?: string) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("toBlob");
    const path = "img/" + slug(name) + "-" + Date.now().toString(36) + ".jpg";
    this.pending.set(path, blob);
    this.previews.set(path, URL.createObjectURL(blob));
    return { path, w, h };
  }

  src(path: string) {
    return this.previews.get(path) || "/" + path;
  }
}

function usedImages(data: SiteContent) {
  const s = new Set<string>();
  data.snaps.forEach((x) => x.img && s.add(x.img));
  data.events.forEach((x) => x.img && s.add(x.img));
  Object.values(data.menu).forEach((list) => list.forEach((x) => x.img && s.add(x.img)));
  return s;
}

function Message({ msg, className = "msg" }: { msg: Msg; className?: string }) {
  return <p className={className + (msg?.ok ? " ok" : "")} role="status" hidden={!msg?.text}>{msg?.text}</p>;
}

export function Admin() {
  const [view, setView] = useState<View>("loading");
  const [cred, setCred] = useState<Credentials | null>(null);
  const [data, setData] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("events");
  const [status, setStatus] = useState<Msg>(null);
  const [saving, setSaving] = useState(false);

  const [loginPass, setLoginPass] = useState("");
  const [loginMsg, setLoginMsg] = useState<Msg>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [setup, setSetup] = useState({ token: "", pass: "", pass2: "" });
  const [setupMsg, setSetupMsg] = useState<Msg>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupCancelable, setSetupCancelable] = useState(false);

  const token = useRef<string | null>(null);
  const loadedJson = useRef<string | null>(null); // content/site.json tal y como estaba al cargar (para detectar cambios ajenos)
  const images = useRef(new ImageStore()).current;
  const dirtyRef = useRef(false);

  const markDirty = (v: boolean) => { dirtyRef.current = v; setDirty(v); };
  const update = (fn: (d: SiteContent) => void) => {
    setData((prev) => { const next = structuredClone(prev!); fn(next); return next; });
    markDirty(true);
  };
  const api = (path: string, opts?: Parameters<typeof gh>[2]) => gh(token.current!, path, opts);

  /* ---------- Arranque ---------- */
  useEffect(() => {
    fetch(CRED_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((c: Credentials | null) => { setCred(c); setView(c ? "login" : "setup"); });

    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirtyRef.current) e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  async function loadContent() {
    const json = await api("/contents/" + CONTENT_FILE + "?ref=" + BRANCH, { raw: true });
    const d = JSON.parse(json) as SiteContent;
    d.snaps ||= []; d.events ||= []; d.menu ||= {}; d.farms ||= {};
    loadedJson.current = json;
    setData(d);
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginMsg(null);
    try {
      token.current = await decryptToken(cred!, loginPass);
    } catch {
      setLoginMsg({ text: "Contraseña incorrecta." });
      setLoginBusy(false);
      return;
    }
    setLoginPass("");
    try {
      await loadContent();
      setView("app");
    } catch (err) {
      token.current = null;
      const expired = errorStatus(err) === 401;
      setLoginMsg({ text: expired ? "El token de GitHub ha caducado o se ha revocado. Pulsa «Cambiar credenciales» tras entrar o vuelve a configurar." : errorMessage(err) });
      if (expired) { setCred(null); setView("setup"); setSetupMsg({ text: "El token guardado ya no funciona. Crea uno nuevo." }); }
    }
    setLoginBusy(false);
  }

  async function onSetup(e: FormEvent) {
    e.preventDefault();
    setSetupBusy(true);
    const newToken = setup.token.trim();
    const previousToken = token.current;
    try {
      if (setup.pass.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
      if (setup.pass !== setup.pass2) throw new Error("Las contraseñas no coinciden.");
      token.current = newToken;
      setSetupMsg({ text: "Comprobando el token…", ok: true });
      const repo = await api("");
      if (!repo.permissions || !repo.permissions.push) throw new Error("Ese token no puede escribir en " + OWNER + "/" + REPO + ".");
      const blob = JSON.stringify(await encryptToken(newToken, setup.pass), null, 2) + "\n";
      let sha: string | undefined;
      try { sha = (await api("/contents/" + CRED_FILE + "?ref=" + BRANCH)).sha; } catch (err) { if (errorStatus(err) !== 404) throw err; }
      await api("/contents/" + CRED_FILE, {
        method: "PUT",
        body: { message: "Admin: actualizar credenciales", content: utf8ToB64(blob), branch: BRANCH, ...(sha ? { sha } : {}) },
      });
      setCred(JSON.parse(blob));
      setSetup({ token: "", pass: "", pass2: "" });
      setSetupMsg(null);
      if (!data) await loadContent();
      setView("app");
    } catch (err) {
      setSetupMsg({ text: errorStatus(err) === 401 ? "GitHub no acepta ese token." : errorMessage(err) });
      token.current = data ? previousToken : null;
    }
    setSetupBusy(false);
  }

  function onLogout() {
    if (dirtyRef.current && !confirm("Hay cambios sin guardar. ¿Salir igualmente?")) return;
    dirtyRef.current = false;
    location.reload();
  }

  function onReconfigure() {
    setSetupCancelable(true);
    setView("setup");
    setSetupMsg({ text: "Introduce un token (puede ser el mismo) y una contraseña nueva.", ok: true });
  }

  /* ---------- Guardar: un único commit con texto + imágenes ---------- */
  async function onSave() {
    if (!data) return;
    setSaving(true);
    try {
      setStatus({ text: "Preparando el commit…", ok: true });
      const ref = await api("/git/ref/heads/" + BRANCH);
      const head: string = ref.object.sha;
      const baseTree: string = (await api("/git/commits/" + head)).tree.sha;
      const current = await api("/contents/" + CONTENT_FILE + "?ref=" + head, { raw: true });
      if (current !== loadedJson.current && !confirm("El contenido ha cambiado en GitHub desde que abriste el admin. ¿Sobrescribirlo con tu versión?")) {
        setStatus({ text: "Guardado cancelado. Recarga la página para ver la versión actual." });
        setSaving(false);
        return;
      }
      const newJson = serialize(data);
      const used = usedImages(data);
      const tree: object[] = [{ path: CONTENT_FILE, mode: "100644", type: "blob", content: newJson }];
      let n = 0;
      for (const [path, blob] of images.pending) {
        if (!used.has(path)) continue;
        setStatus({ text: "Subiendo imagen " + (++n) + "…", ok: true });
        const content = b64(await blob.arrayBuffer());
        const created = await api("/git/blobs", { method: "POST", body: { content, encoding: "base64" } });
        tree.push({ path: PUBLIC_DIR + path, mode: "100644", type: "blob", sha: created.sha });
      }
      setStatus({ text: "Creando commit…", ok: true });
      const newTree = await api("/git/trees", { method: "POST", body: { base_tree: baseTree, tree } });
      const message = "Admin: actualizar eventos, carta y fotos" + (n ? " (" + n + " imagen" + (n > 1 ? "es" : "") + " nueva" + (n > 1 ? "s" : "") + ")" : "");
      const commit = await api("/git/commits", { method: "POST", body: { message, tree: newTree.sha, parents: [head] } });
      await api("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: commit.sha } });
      loadedJson.current = newJson;
      images.pending.clear();
      markDirty(false);
      setStatus({ text: "Publicado (" + commit.sha.slice(0, 7) + "). La web se actualizará cuando termine el despliegue.", ok: true });
    } catch (err) {
      const s = errorStatus(err);
      setStatus({ text: s === 409 || s === 422
        ? "Alguien ha subido cambios a la vez. Vuelve a pulsar «Guardar y publicar»."
        : "No se pudo guardar: " + errorMessage(err) });
    }
    setSaving(false);
  }

  return (
    <>
      {/* Primera vez: guardar el token cifrado con la contraseña */}
      <div className="gate" hidden={view !== "setup"}>
        <form onSubmit={onSetup}>
          <h1>Configurar admin</h1>
          <p className="muted" style={{ margin: 0 }}>Crea en GitHub un <em>fine-grained token</em> limitado a este repositorio con permiso <span className="mono">Contents: Read and write</span>. Se guarda en el repositorio cifrado con tu contraseña; nadie sin ella puede usarlo.</p>
          <label>Token de GitHub <input type="password" autoComplete="off" required value={setup.token} onChange={(e) => setSetup({ ...setup, token: e.target.value })} /></label>
          <label>Contraseña nueva (mín. 12 caracteres) <input type="password" autoComplete="new-password" minLength={12} required value={setup.pass} onChange={(e) => setSetup({ ...setup, pass: e.target.value })} /></label>
          <label>Repite la contraseña <input type="password" autoComplete="new-password" minLength={12} required value={setup.pass2} onChange={(e) => setSetup({ ...setup, pass2: e.target.value })} /></label>
          <Message msg={setupMsg} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="submit" disabled={setupBusy}>Guardar y entrar</button>
            <button className="btn ghost" type="button" hidden={!setupCancelable} onClick={() => setView("app")}>Cancelar</button>
          </div>
        </form>
      </div>

      {/* Acceso */}
      <div className="gate" hidden={view !== "login"}>
        <form onSubmit={onLogin}>
          <h1>Radicle</h1>
          {view === "login" && (
            <label>Contraseña <input type="password" autoComplete="current-password" required autoFocus value={loginPass} onChange={(e) => setLoginPass(e.target.value)} /></label>
          )}
          <Message msg={loginMsg} />
          <button className="btn" type="submit" disabled={loginBusy}>Entrar</button>
        </form>
      </div>

      {/* Editor */}
      {data && (
        <div hidden={view !== "app"}>
          <header className="bar">
            <div className="wrap">
              <h1>Radicle · admin</h1>
              <span className="dirty" hidden={!dirty}>Cambios sin guardar</span>
              <button className="btn ghost small" type="button" onClick={onReconfigure}>Cambiar credenciales</button>
              <button className="btn ghost small" type="button" onClick={onLogout}>Salir</button>
              <button className="btn" type="button" onClick={onSave} disabled={saving}>Guardar y publicar</button>
            </div>
          </header>
          <main className="wrap">
            <div className="tabs" role="tablist">
              {([["events", "Eventos"], ["menu", "Carta"], ["snaps", "Fotos de platos"]] as const).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
              ))}
            </div>
            <Message msg={status} className="msg status" />
            <section hidden={tab !== "events"}><EventsPanel data={data} update={update} images={images} /></section>
            <section hidden={tab !== "menu"}><MenuPanel data={data} update={update} images={images} /></section>
            <section hidden={tab !== "snaps"}><SnapsPanel data={data} update={update} images={images} /></section>
          </main>
        </div>
      )}
    </>
  );
}

/* ---------- Controles ---------- */
type Update = (fn: (d: SiteContent) => void) => void;
type PanelProps = { data: SiteContent; update: Update; images: ImageStore };

function Field({ label, value, onChange, type = "text", className, rows }: {
  label: string; value: string | undefined; onChange: (v: string) => void; type?: string; className?: string; rows?: number;
}) {
  return (
    <label className={className}>
      {label}
      {type === "textarea"
        ? <textarea rows={rows || 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        : <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

/* Guarda un número, pero deja escribir libremente (campo vacío, "1.", …) */
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value ?? ""));
  const num = (v: string) => (v === "" ? 0 : Number(v));
  useEffect(() => { setText((t) => (num(t) === value ? t : String(value))); }, [value]);
  return (
    <label>
      {label}
      <input type="number" step="any" value={text} onChange={(e) => { setText(e.target.value); onChange(num(e.target.value)); }} />
    </label>
  );
}

function PictureEditor({ obj, name, edit, images }: {
  obj: Picture; name?: string; edit: (fn: (o: Picture) => void) => void; images: ImageStore;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  async function onFile() {
    const f = fileRef.current!.files?.[0];
    if (!f) return;
    try {
      const { path, w, h } = await images.prepare(f, name);
      edit((o) => { o.img = path; o.w = w; o.h = h; });
    } catch {
      alert("No se pudo leer esa imagen.");
    }
    fileRef.current!.value = "";
  }
  return (
    <div className="pic">
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {obj.img ? <img src={images.src(obj.img)} alt="" /> : "Sin imagen"}
      </div>
      <div className="row">
        <button type="button" className="btn ghost small" onClick={() => fileRef.current!.click()}>{obj.img ? "Cambiar" : "Subir imagen"}</button>
        <button type="button" className="btn danger small" hidden={!obj.img} onClick={() => edit((o) => { delete o.img; delete o.w; delete o.h; })}>Quitar</button>
        <input type="file" accept="image/*" ref={fileRef} onChange={onFile} />
      </div>
      <Field label="Texto alternativo" value={obj.alt} onChange={(v) => edit((o) => { o.alt = v; })} />
    </div>
  );
}

/* Botones ↑ ↓ Eliminar para el elemento i de una lista */
function Actions({ update, list, i }: { update: Update; list: (d: SiteContent) => unknown[]; i: number }) {
  const move = (delta: number) => update((d) => {
    const l = list(d), j = i + delta;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
  });
  return (
    <div className="actions">
      <button type="button" className="btn ghost small" onClick={() => move(-1)} aria-label="Subir">↑</button>
      <button type="button" className="btn ghost small" onClick={() => move(1)} aria-label="Bajar">↓</button>
      <button type="button" className="btn danger small" onClick={() => { if (confirm("¿Eliminar este elemento?")) update((d) => { list(d).splice(i, 1); }); }}>Eliminar</button>
    </div>
  );
}

/* ---------- Paneles ---------- */
function EventsPanel({ data, update, images }: PanelProps) {
  return (
    <>
      <h2>Eventos</h2>
      <p className="muted">Los eventos con fecha pasada no se muestran en la web. Con 0 plazas aparece como «Completo».</p>
      <ul className="list">
        {data.events.map((ev, i) => {
          const edit = (fn: (e: typeof ev) => void) => update((d) => fn(d.events[i]));
          return (
            <li className="item" key={i}>
              <PictureEditor obj={ev} name={ev.title} edit={edit} images={images} />
              <div className="fields">
                <Field label="Título" className="w4" value={ev.title} onChange={(v) => edit((e) => { e.title = v; })} />
                <Field label="Fecha" type="date" value={ev.date} onChange={(v) => edit((e) => { e.date = v; })} />
                <Field label="Hora" type="time" value={ev.time} onChange={(v) => edit((e) => { e.time = v; })} />
                <NumberField label="Precio (€)" value={ev.price} onChange={(v) => edit((e) => { e.price = v; })} />
                <NumberField label="Plazas libres" value={ev.left} onChange={(v) => edit((e) => { e.left = v; })} />
                <Field label="Descripción" type="textarea" className="w4" rows={4} value={ev.text} onChange={(v) => edit((e) => { e.text = v; })} />
              </div>
              <Actions update={update} list={(d) => d.events} i={i} />
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn ghost" onClick={() => update((d) => { d.events.push({ date: "", time: "19:00", title: "Nuevo evento", text: "", price: 0, left: 10 }); })}>+ Añadir evento</button>
    </>
  );
}

function MenuPanel({ data, update, images }: PanelProps) {
  const farmOptions = Object.entries(data.farms);
  const tags = [["VG", "Vegano"], ["SG", "Sin gluten"]] as const;
  return (
    <>
      <p className="muted">La imagen de un plato es opcional; si la añades aparece encima de su descripción.</p>
      {Object.keys(data.menu).map((course) => (
        <div className="course" key={course}>
          <h2>{course}</h2>
          <ul className="list">
            {data.menu[course].map((dish, i) => {
              const edit = (fn: (x: Dish) => void) => update((d) => fn(d.menu[course][i]));
              return (
                <li className="item" key={i}>
                  <PictureEditor obj={dish} name={dish.n} edit={edit} images={images} />
                  <div className="fields">
                    <Field label="Nombre" className="w2" value={dish.n} onChange={(v) => edit((x) => { x.n = v; })} />
                    <NumberField label="Precio (€)" value={dish.p} onChange={(v) => edit((x) => { x.p = v; })} />
                    <label>
                      Origen
                      <select value={dish.f} onChange={(e) => edit((x) => { x.f = e.target.value; })}>
                        {farmOptions.map(([k, f]) => <option key={k} value={k}>{f.name + " · " + f.km + " km"}</option>)}
                      </select>
                    </label>
                    <Field label="Descripción" type="textarea" className="w4" value={dish.d} onChange={(v) => edit((x) => { x.d = v; })} />
                    <div className="w4" style={{ display: "flex", gap: 18 }}>
                      {tags.map(([t, label]) => (
                        <label className="check" key={t}>
                          <input type="checkbox" checked={dish.tags.includes(t)} onChange={(e) => edit((x) => {
                            x.tags = x.tags.filter((y) => y !== t);
                            if (e.target.checked) x.tags.push(t);
                          })} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Actions update={update} list={(d) => d.menu[course]} i={i} />
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn ghost" onClick={() => update((d) => {
            d.menu[course].push({ n: "Nuevo plato", d: "", p: 0, f: farmOptions[0] ? farmOptions[0][0] : "", tags: [] });
          })}>+ Añadir plato a {course}</button>
        </div>
      ))}
    </>
  );
}

function SnapsPanel({ data, update, images }: PanelProps) {
  return (
    <>
      <h2>Fotos de platos</h2>
      <p className="muted">Las fotos tipo polaroid de la portada. Se ven mejor en vertical (4:5) y en grupos de 4.</p>
      <ul className="list">
        {data.snaps.map((s, i) => {
          const edit = (fn: (x: typeof s) => void) => update((d) => fn(d.snaps[i]));
          return (
            <li className="item" key={i}>
              <PictureEditor obj={s} name={s.caption} edit={edit} images={images} />
              <div className="fields">
                <Field label="Pie de foto" className="w4" value={s.caption} onChange={(v) => edit((x) => { x.caption = v; })} />
              </div>
              <Actions update={update} list={(d) => d.snaps} i={i} />
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn ghost" onClick={() => update((d) => { d.snaps.push({ caption: "nuevo plato", alt: "" }); })}>+ Añadir foto</button>
    </>
  );
}
