/* Página Circuitos: mapa de la ruta (mundo + ampliación de Europa), longitudes y fichas */
import { CALENDAR } from './data.js';
import { $, $$, esc, pad, fmtRange, prefersReducedMotion } from './utils.js';
import { raceStatus, hbarsHTML, staggerIn, inView } from './shared.js';

const NS = 'http://www.w3.org/2000/svg';
const km = (c) => parseFloat(String(c.km).replace(',', '.'));
const fmtKm = (n) => n.toFixed(3).replace('.', ',');
const fmtInt = (n) => Math.round(n).toLocaleString('es-ES');

/* Distancia ortodrómica (km) */
function haversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const continent = (c) =>
  c.lon < -30 ? 'América' : c.lat < -11 && c.lon > 100 ? 'Oceanía' : c.lon > 40 || c.lat < 30 ? 'Asia' : 'Europa';

/* Vistas del mapa (proyección equirrectangular) */
const WORLD = { lonMin: -115, lonMax: 160, latMin: -48, latMax: 62, k: 3.6 };
const EUROPE = { lonMin: -11, lonMax: 21, latMin: 35, latMax: 55, k: 12 };
const inBox = (v, c) => c.lon >= v.lonMin && c.lon <= v.lonMax && c.lat >= v.latMin && c.lat <= v.latMax;
const isEU = (c) => inBox(EUROPE, c);
const proj = (v, c) => [(c.lon - v.lonMin) * v.k, (v.latMax - c.lat) * v.k];

/* Posición de la etiqueta (r derecha, l izquierda, b debajo) para evitar choques y bordes */
const EU_LABEL = { 7: 'l', 13: 'l', 22: 'l', 21: 'b' };
const WORLD_LABEL = { 16: 'l', 18: 'l' };

function arc([x1, y1], [x2, y2]) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bend = 0.18;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx - dy * bend).toFixed(1)},${(my + dx * bend).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

function routeSVG(v) {
  let out = '';
  for (let i = 0; i < CALENDAR.length - 1; i++) {
    const a = CALENDAR[i];
    const b = CALENDAR[i + 1];
    const done = raceStatus(b) === 'done';
    out += `<path class="route ${done ? 'route--done' : 'route--todo'}" d="${arc(proj(v, a), proj(v, b))}"/>`;
  }
  return out;
}

function pinSVG(v, c, { label, focusable = true, side = 'r' }) {
  const [x, y] = proj(v, c);
  const st = raceStatus(c);
  const lx = side === 'l' ? x - 9 : side === 'b' ? x : x + 9;
  const ly = side === 'b' ? y + 17 : y + 3.5;
  const anchor = side === 'l' ? 'end' : side === 'b' ? 'middle' : 'start';
  const attrs = focusable
    ? `href="#circuito-${c.r}" data-r="${c.r}" aria-label="Ronda ${c.r}, ${esc(c.country)}: ${esc(c.circuit)}"`
    : 'tabindex="-1" aria-hidden="true"';
  return `<a class="pin is-${st}" ${attrs}>
    <circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13"/>
    ${st === 'next' ? `<circle class="ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>` : ''}
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>
    ${label ? `<text class="lbl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">${esc(label)}</text>` : ''}
  </a>`;
}

function worldSVG() {
  const v = WORLD;
  const w = (v.lonMax - v.lonMin) * v.k;
  const h = (v.latMax - v.latMin) * v.k;
  let grid = '';
  for (let lon = -90; lon <= 150; lon += 30) {
    const [x] = proj(v, { lon, lat: 0 });
    grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  }
  [-30, 0, 30, 60].forEach((lat) => {
    const [, y] = proj(v, { lon: 0, lat });
    grid += `<line class="${lat === 0 ? 'eq' : ''}" x1="0" y1="${y}" x2="${w}" y2="${y}"/><text x="4" y="${y - 5}">${lat === 0 ? 'ECUADOR' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`}</text>`;
  });
  const [ex1, ey1] = proj(v, { lon: EUROPE.lonMin, lat: EUROPE.latMax });
  const [ex2, ey2] = proj(v, { lon: EUROPE.lonMax, lat: EUROPE.latMin });
  const pins = CALENDAR.map((c) =>
    isEU(c) ? pinSVG(v, c, { focusable: false }) : pinSVG(v, c, { label: `R${c.r} ${c.city}`, side: WORLD_LABEL[c.r] || 'r' })
  ).join('');
  return `<svg viewBox="-10 -10 ${w + 20} ${h + 20}" role="group" aria-labelledby="map-world-t">
    <title id="map-world-t">Mapa del mundo con los circuitos fuera de Europa</title>
    <g class="grid" aria-hidden="true">${grid}</g>
    <rect class="inset-zone" x="${ex1}" y="${ey1}" width="${ex2 - ex1}" height="${ey2 - ey1}" aria-hidden="true"/>
    <text class="lbl" x="${ex2 + 6}" y="${ey1 + 10}" aria-hidden="true">EUROPA · AMPLIADA</text>
    <g aria-hidden="true">${routeSVG(v)}</g>
    <g>${pins}</g>
  </svg>`;
}

function europeSVG() {
  const v = EUROPE;
  const w = (v.lonMax - v.lonMin) * v.k;
  const h = (v.latMax - v.latMin) * v.k;
  let grid = '';
  for (let lon = -10; lon <= 20; lon += 10) {
    const [x] = proj(v, { lon, lat: 0 });
    grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  }
  for (let lat = 40; lat <= 50; lat += 5) {
    const [, y] = proj(v, { lon: 0, lat });
    grid += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/><text x="4" y="${y - 5}">${lat}°N</text>`;
  }
  const pins = CALENDAR.filter(isEU).map((c) => pinSVG(v, c, { label: `R${c.r}`, side: EU_LABEL[c.r] || 'r' })).join('');
  return `<svg viewBox="-12 -12 ${w + 24} ${h + 24}" role="group" aria-labelledby="map-eu-t">
    <title id="map-eu-t">Ampliación de Europa: 14 circuitos</title>
    <defs><clipPath id="eu-clip"><rect x="-12" y="-12" width="${w + 24}" height="${h + 24}"/></clipPath></defs>
    <rect class="inset-box" x="-12" y="-12" width="${w + 24}" height="${h + 24}" aria-hidden="true"/>
    <g class="grid" aria-hidden="true">${grid}</g>
    <g aria-hidden="true" clip-path="url(#eu-clip)">${routeSVG(v)}</g>
    <g>${pins}</g>
  </svg>`;
}

function renderMap(ctx) {
  const box = $('#map');
  box.insertAdjacentHTML(
    'beforeend',
    `<div class="map__grid">
      <div class="map__world">${worldSVG()}</div>
      <div class="map__eu"><p class="mono map__cap">Europa · 14 circuitos</p>${europeSVG()}</div>
    </div>
    <div class="tip" role="status" aria-live="polite"></div>`
  );
  const tip = $('.tip', box);
  const show = (pin) => {
    const c = CALENDAR.find((x) => x.r === Number(pin.dataset.r));
    if (!c) return;
    const st = raceStatus(c);
    const res = st === 'done' ? `Ganó ${c.winner || 'sin dato'}` : st === 'next' ? 'Próximo GP' : 'Por disputar';
    tip.innerHTML = `<span class="mono">Ronda ${pad(c.r)} · ${fmtRange(c.start, c.end)}</span>
      <b>${esc(c.country)}</b><span>${esc(c.circuit)}</span><small class="mono">${c.km} km · ${esc(res)}</small>`;
    const r = pin.querySelector('circle:not(.halo)').getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.min(Math.max(r.left + r.width / 2 - b.left, half + 8), b.width - half - 8);
    const above = r.top - b.top > tip.offsetHeight + 24;
    tip.style.left = `${x}px`;
    tip.style.top = `${(above ? r.top : r.bottom) - b.top}px`;
    tip.style.transform = above ? 'translate(-50%, calc(-100% - 14px))' : 'translate(-50%, 14px)';
    tip.classList.add('is-on');
    $$('.pin.is-on', box).forEach((p) => p.classList.remove('is-on'));
    pin.classList.add('is-on');
  };
  const hide = () => { tip.classList.remove('is-on'); $$('.pin.is-on', box).forEach((p) => p.classList.remove('is-on')); };
  $$('.pin[data-r]', box).forEach((pin) => {
    pin.addEventListener('pointerenter', () => show(pin));
    pin.addEventListener('pointerleave', hide);
    pin.addEventListener('focus', () => show(pin));
    pin.addEventListener('blur', hide);
  });

  // la ruta recorrida se dibuja al entrar en pantalla
  if (prefersReducedMotion()) return;
  const { gsap, ScrollTrigger } = ctx;
  const done = $$('.route--done', box);
  done.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  gsap.set($$('.pin', box), { opacity: 0 });
  ScrollTrigger.create({
    trigger: box,
    start: 'top 75%',
    once: true,
    onEnter: () => {
      gsap.to($$('.pin', box), { opacity: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out' });
      gsap.to(done, { strokeDashoffset: 0, duration: 0.5, stagger: 0.09, ease: 'power1.inOut', delay: 0.2 });
    },
  });
}

function renderStats() {
  let total = 0;
  let travelled = 0;
  for (let i = 0; i < CALENDAR.length - 1; i++) {
    const d = haversine(CALENDAR[i], CALENDAR[i + 1]);
    total += d;
    if (raceStatus(CALENDAR[i + 1]) === 'done') travelled += d;
  }
  const byLen = [...CALENDAR].sort((a, b) => km(b) - km(a));
  const longest = byLen[0];
  const shortest = byLen[byLen.length - 1];
  const continents = new Set(CALENDAR.map(continent)).size;
  $('#ph-stats').innerHTML = [
    [`${Math.round(total / 1000)}<small>mil</small>`, `km de viaje (${fmtInt(total)} km)`],
    [continents, 'Continentes'],
    [fmtKm(km(longest)), `km · el más largo (${longest.circuit})`],
    [fmtKm(km(shortest)), `km · el más corto (${shortest.circuit})`],
  ]
    .map(([n, label]) => `<div><dt class="mono">${esc(label)}</dt><dd>${n}</dd></div>`)
    .join('');
  return { total, travelled };
}

function renderLengths(ScrollTrigger) {
  const rows = [...CALENDAR].sort((a, b) => km(a) - km(b)).map((c) => ({ name: c.circuit, n: km(c), c }));
  const el = $('#len');
  el.innerHTML = hbarsHTML(rows, { fmt: fmtKm, sub: (r) => `R${r.c.r} · ${r.c.country}` });
  inView(ScrollTrigger, el);
}

function renderCards() {
  const max = Math.max(...CALENDAR.map(km));
  $('#ccards').innerHTML = CALENDAR.map((c) => {
    const st = raceStatus(c);
    const pill = st === 'done' ? '<span class="pill pill--done mono">Disputado</span>'
      : st === 'next' ? '<span class="pill pill--next mono"><i class="dot"></i>Próximo</span>'
      : '<span class="pill mono">Por disputar</span>';
    return `<li class="ccard glass is-${st}" id="circuito-${c.r}">
      <p class="ccard__top mono"><span>Ronda ${pad(c.r)} · ${continent(c)}</span>${pill}</p>
      <p class="ccard__km"><b>${fmtKm(km(c))}</b><small class="mono">km</small></p>
      <span class="ccard__len" aria-hidden="true"><i style="--w:${(km(c) / max).toFixed(4)}"></i></span>
      <h3 class="display ccard__name">${esc(c.country)}</h3>
      <p class="ccard__circuit">${esc(c.circuit)}</p>
      <dl>
        <div><dt class="mono">Fecha</dt><dd>${fmtRange(c.start, c.end)}</dd></div>
        <div><dt class="mono">Localidad</dt><dd>${esc(c.city)}</dd></div>
        <div><dt class="mono">Ganador 2026</dt><dd>${esc(c.winner || (st === 'done' ? 'Sin dato' : '—'))}</dd></div>
        <div><dt class="mono">Pole 2026</dt><dd>${esc(c.pole || '—')}</dd></div>
      </dl>
    </li>`;
  }).join('');
}

export function initPage(ctx) {
  const { total, travelled } = renderStats();
  renderMap(ctx);
  $('#map').insertAdjacentHTML(
    'afterend',
    `<p class="mono map__km"><b>${fmtInt(travelled)} km</b> recorridos de ${fmtInt(total)} · quedan ${fmtInt(total - travelled)} km hasta ${esc(CALENDAR[CALENDAR.length - 1].country)}</p>`
  );
  renderLengths(ctx.ScrollTrigger);
  renderCards();
  staggerIn(ctx, $$('.ccard'), { y: 40, stagger: 0.05 });
}
