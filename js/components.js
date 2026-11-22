/* Componentes compartidos: nav, menú móvil y footer (sin duplicar HTML) */
import { esc } from './utils.js';
import { SEASON, SOURCES } from './data.js';

export const PAGES = [
  { href: 'index.html',         id: 'home',          label: 'Inicio',        title: 'Inicio' },
  { href: 'calendario.html',    id: 'calendario',    label: 'Calendario',    title: 'Calendario' },
  { href: 'resultados.html',    id: 'resultados',    label: 'Resultados',    title: 'Resultados' },
  { href: 'clasificacion.html', id: 'clasificacion', label: 'Clasificación', title: 'Clasificación' },
  { href: 'circuitos.html',     id: 'circuitos',     label: 'Circuitos',     title: 'Circuitos' },
];

const Brand = () => `
  <a class="brand" href="index.html" aria-label="REDLINE 26 · Inicio">
    <span class="brand__mark" aria-hidden="true"></span>
    <span class="brand__txt">REDLINE<em>/26</em></span>
  </a>`;

export function renderNav(active) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="nav__in">
      ${Brand()}
      <nav class="nav__links mono" aria-label="Principal">
        ${PAGES.map(
          (p) =>
            `<a href="${p.href}" data-title="${esc(p.title)}" ${p.id === active ? 'aria-current="page"' : ''}><span>${esc(p.label)}</span></a>`
        ).join('')}
      </nav>
      <a class="btn btn--sm nav__cta mono" href="calendario.html#proximo" data-title="Calendario" data-magnetic>PRÓXIMO GP <span aria-hidden="true">↗</span></a>
      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">
        <span></span><span></span>
      </button>
    </div>`;

  const menu = document.getElementById('menu');
  if (menu) {
    menu.innerHTML = `
      <nav class="menu__in" aria-label="Menú móvil">
        <p class="mono menu__eyebrow">NAVEGACIÓN · RONDA ${SEASON.completedRounds}/${SEASON.totalRounds}</p>
        <ul>
          ${PAGES.map(
            (p, i) =>
              `<li><a class="display" href="${p.href}" data-title="${esc(p.title)}" ${p.id === active ? 'aria-current="page"' : ''}><small class="mono">0${i + 1}</small>${esc(p.label)}</a></li>`
          ).join('')}
        </ul>
        <p class="mono menu__foot">DATOS A ${SEASON.asOfLabel}</p>
      </nav>`;
  }
}

export function renderFooter() {
  const f = document.getElementById('footer');
  if (!f) return;
  f.innerHTML = `
    <div class="footer__in">
      <p class="footer__mark display" aria-hidden="true">REDLINE<em>/26</em></p>
      <div class="footer__cols">
        <div>
          <h2 class="mono footer__h">Mundial</h2>
          <ul class="footer__list">
            ${PAGES.map((p) => `<li><a href="${p.href}" data-title="${esc(p.title)}">${esc(p.label)}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h2 class="mono footer__h">Fuentes de datos</h2>
          <ul class="footer__list footer__list--src">
            ${SOURCES.map(
              (s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} <span aria-hidden="true">↗</span></a></li>`
            ).join('')}
          </ul>
        </div>
        <div>
          <h2 class="mono footer__h">Aviso</h2>
          <p class="footer__legal">
            Sitio informativo no oficial. MotoGP™, Moto2™ y Moto3™ son marcas de sus respectivos titulares;
            esta web no usa sus logotipos ni imágenes. Datos ${SEASON.source === 'live' ? 'oficiales actualizados automáticamente' : 'guardados'} a ${SEASON.asOfLabel}, tras el ${esc(SEASON.lastRaceLabel)}.
            Pueden contener errores: consulta siempre la fuente oficial.
          </p>
        </div>
      </div>
      <p class="mono footer__base"><span>© ${SEASON.year} REDLINE/26</span><span>HECHO A MANO · HTML · CSS · JS</span></p>
    </div>`;
}

/* Menú móvil a pantalla completa */
export function initMenu({ gsap, lenis }) {
  const burger = document.querySelector('.nav__burger');
  const menu = document.getElementById('menu');
  if (!burger || !menu) return;
  let open = false;

  const links = Array.from(menu.querySelectorAll('a'));
  const set = (state) => {
    open = state;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.documentElement.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (gsap && open && !document.documentElement.classList.contains('reduce')) {
      gsap.fromTo(links, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'expo.out', delay: 0.15 });
    }
    if (open) links[0] && links[0].focus({ preventScroll: true });
    else burger.focus({ preventScroll: true });
  };

  menu.setAttribute('aria-hidden', 'true');
  burger.addEventListener('click', () => set(!open));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) set(false);
  });
  links.forEach((a) => a.addEventListener('click', () => { if (open) { document.documentElement.classList.remove('menu-open'); } }));
  matchMedia('(min-width: 900px)').addEventListener?.('change', (e) => { if (e.matches && open) set(false); });
}

/* Nav: se oculta al bajar y reaparece al subir */
export function initNavAutoHide() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let last = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const menuOpen = document.documentElement.classList.contains('menu-open');
      nav.classList.toggle('is-solid', y > 40);
      if (!menuOpen) nav.classList.toggle('is-hidden', y > last && y > 160);
      last = y;
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
