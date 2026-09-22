import { BookingForm, BookingProvider } from "@/components/Booking";
import { EventList } from "@/components/EventList";
import { Hours } from "@/components/Hours";
import { Menu } from "@/components/Menu";
import { RootsCanvas } from "@/components/RootsCanvas";
import { content, imgSrc } from "@/lib/content";
import { isoDate } from "@/lib/dates";

export default function Home() {
  const { snaps, events, farms, menu } = content;

  return (
    <BookingProvider>
      <nav className="nav" aria-label="Principal">
        <div className="wrap">
          <a className="brand" href="#top">Radicle</a>
          <ul>
            <li className="hide-sm"><a href="#eventos">Eventos</a></li>
            <li><a href="#carta">Carta</a></li>
            <li><a className="btn" href="#visita">Reservar mesa</a></li>
          </ul>
        </div>
      </nav>

      <header className="hero" id="top">
        <RootsCanvas />
        <div className="wrap">
          <p className="eyebrow">Cocina vegetariana · Calle de los Curtidores 14</p>
          <h1>Radicle<span>Cocinamos lo que nos manda la tierra.</span></h1>
          <div className="hero-foot">
            <p>La radícula es la primera raíz que echa una semilla. Le pusimos ese nombre porque todo lo que servimos nace a menos de cincuenta kilómetros de nuestra puerta, y la carta cambia cuando cambian los campos.</p>
            <dl className="facts">
              <div><dt>carne, nunca</dt><dd>0</dd></div>
              <div><dt>km, la granja más lejana</dt><dd>44</dd></div>
              <div><dt>de la carta es vegana</dt><dd>~60%</dd></div>
            </dl>
          </div>

          <ul className="snaps" aria-label="Hecho en casa">
            {snaps.filter((s) => s.img).map((s, i) => (
              <li key={s.img}>
                <figure className="snap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(s.img!)} alt={s.alt || ""} width={s.w} height={s.h} loading={i > 0 ? "lazy" : undefined} />
                  <figcaption>{s.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main>
        <section className="events" id="eventos">
          <div className="wrap">
            <p className="eyebrow">Fuera del horario normal</p>
            <h2>Lo que pasa en la cocina</h2>
            <p className="lede">Talleres, mesas largas y catas. Los grupos son pequeños porque cabemos los que cabemos: pide plaza y te escribimos para confirmar.</p>
            <EventList events={events} buildDate={isoDate(new Date())} />
          </div>
        </section>

        <section id="carta">
          <div className="wrap">
            <p className="eyebrow">Carta de otoño · cambia cada semana</p>
            <h2>Los platos de esta noche</h2>
            <p className="lede">Cocinamos para compartir. Con tres o cuatro platos por persona vas sobrado. Cada plato indica dónde creció su ingrediente principal y cuántos kilómetros recorrió hasta aquí.</p>
            <Menu menu={menu} farms={farms} />
            <p className="legend">VG vegano · SG sin gluten · Si tienes alguna alergia, dínoslo al reservar y adaptamos los platos.</p>
          </div>
        </section>

        <section className="visit" id="visita">
          <div className="wrap">
            <p className="eyebrow">Ven con hambre</p>
            <h2>Visítanos y reserva</h2>
            <div className="visit-grid">
              <div>
                <Hours />
                <address>
                  <strong>Radicle</strong><br />
                  Calle de los Curtidores 14, Barrio del Mercado Viejo<br />
                  <a href="tel:+34000000000">+34 000 000 000</a> · <a href="mailto:hola@radicle.kitchen">hola@radicle.kitchen</a>
                </address>
              </div>
              <BookingForm />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a className="brand" href="#top">Radicle</a>
          <span>Cada lunes el compost vuelve a la Huerta del Hondo.</span>
          <span>© 2026 Radicle Cocina</span>
          <span className="credits">Fotos: Monika Borys, Franzi Meyer, Vincent Dörig y Christina Rumpf en Unsplash.</span>
        </div>
      </footer>
    </BookingProvider>
  );
}
