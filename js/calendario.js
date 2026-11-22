/* Página Calendario: progreso de temporada, próxima carrera y las 22 rondas */
import { SEASON, CALENDAR, NEXT_RACE } from './data.js';
import { $, $$, esc, pad, fmtRange } from './utils.js';
import { raceStatus, tally, startCountdown, staggerIn } from './shared.js';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const FILTERS = [
  { id: 'all', label: 'Todas', test: () => true },
  { id: 'done', label: 'Disputadas', test: (c) => raceStatus(c) === 'done' },
  { id: 'todo', label: 'Por disputar', test: (c) => raceStatus(c) !== 'done' },
];

/* El GP pertenece al mes del domingo de carrera */
const monthOf = (c) => Number(c.end.split('-')[1]) - 1;

function renderStats() {
  const left = SEASON.totalRounds - SEASON.completedRounds;
  const winners = tally('winner').length;
  const last = CALENDAR[CALENDAR.length - 1];
  const daysLeft = Math.max(0, Math.ceil((new Date(`${last.end}T12:00:00Z`) - Date.now()) / 86400000));
  $('#ph-stats').innerHTML = [
    [SEASON.completedRounds, `/${SEASON.totalRounds}`, 'GP disputados'],
    [left, '', 'Por disputar'],
    [winners, '', 'Ganadores distintos'],
    [daysLeft, '', `Días para ${last.country}`],
  ]
    .map(([n, small, label]) => `<div><dt class="mono">${label}</dt><dd>${n}${small ? `<small class="mono">${small}</small>` : ''}</dd></div>`)
    .join('');
}

function renderStrip() {
  $('#strip').innerHTML = CALENDAR.map((c) => {
    const st = raceStatus(c);
    const what = st === 'done' ? (c.winner ? `ganó ${c.winner}` : c.cancelled ? 'carrera cancelada' : 'sin dato') : st === 'next' ? 'próximo GP' : 'por disputar';
    return `<a href="#ronda-${c.r}" class="is-${st}" aria-label="Ronda ${c.r}, ${esc(c.country)}: ${esc(what)}" title="R${c.r} · ${esc(c.country)}"><span>${pad(c.r)}</span></a>`;
  }).join('');
}

function renderNext() {
  const race = CALENDAR.find((c) => c.r === NEXT_RACE.round);
  if (!race) {
    $('#next-eyebrow').textContent = `TEMPORADA ${SEASON.year} · ${SEASON.totalRounds}/${SEASON.totalRounds} GP`;
    $('#next-title').innerHTML = 'Temporada <em>cerrada</em>';
    $('#next-meta').textContent = 'Todos los Grandes Premios se han disputado. Consulta los resultados y la clasificación final.';
    const grid = $('#cd-d') && $('#cd-d').closest('[role="timer"]');
    if (grid) grid.hidden = true;
    return;
  }
  $('#next-eyebrow').textContent = `PRÓXIMA PARADA · RONDA ${race.r}/${SEASON.totalRounds}`;
  $('#next-title').innerHTML = `GP de <em>${esc(race.country)}</em>`;
  $('#next-meta').innerHTML = [
    `<b>${esc(race.circuit)}</b>`,
    `${fmtRange(race.start, race.end)} · ${esc(race.city)}`,
    NEXT_RACE.approx ? '<span class="warn">Hora aproximada</span>' : esc(NEXT_RACE.localLabel),
    race.km ? `${race.km} KM DE TRAZADO` : '',
  ].filter(Boolean).join('<br>');
}

function rowHTML(c) {
  const st = raceStatus(c);
  let res;
  if (st === 'done') {
    res = c.winner
      ? `<span class="crow__win"><small class="mono">Ganador MotoGP${c.maker ? ` · ${esc(c.maker)}` : ''}</small><b>${esc(c.winner)}</b></span>`
      : `<span class="pill pill--done mono">${c.cancelled ? 'Carrera cancelada' : 'Disputado · sin dato'}</span>`;
  } else if (st === 'next') {
    res = '<span class="pill pill--next mono"><i class="dot"></i>Próximo GP</span>';
  } else {
    const days = Math.ceil((new Date(`${c.end}T12:00:00Z`) - Date.now()) / 86400000);
    res = `<span class="pill mono">${days > 0 ? `En ${days} días` : 'Por disputar'}</span>`;
  }
  const place = c.city === c.circuit ? c.circuit : `${c.circuit} · ${c.city}`;
  return `<li class="crow is-${st}" id="ronda-${c.r}" data-status="${st}">
    <div class="crow__in">
      <span class="crow__n display" aria-hidden="true">${pad(c.r)}</span>
      <span class="crow__place">
        <span class="sr-only">Ronda ${c.r}:</span>
        <b class="display crow__country">${esc(c.country)}</b>
        <span class="crow__circuit">${esc(place)}</span>
      </span>
      <span class="crow__date mono">${fmtRange(c.start, c.end)}${c.km ? `<br><span style="color:var(--muted)">${c.km} KM</span>` : ''}</span>
      <span class="crow__res">${res}</span>
    </div>
  </li>`;
}

function renderList() {
  const groups = new Map();
  CALENDAR.forEach((c) => {
    const m = monthOf(c);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(c);
  });
  $('#cal-list').innerHTML = [...groups]
    .map(
      ([m, races]) => `<section class="month" aria-labelledby="mes-${m}">
        <div class="month__h"><h3 class="display" id="mes-${m}">${MONTHS[m]}</h3><span class="mono">${races.length} GP</span></div>
        <ol>${races.map(rowHTML).join('')}</ol>
      </section>`
    )
    .join('');
}

function bindFilters(ScrollTrigger) {
  const box = $('#cal-filters');
  const count = $('#cal-count');
  box.innerHTML = FILTERS.map(
    (f, i) => `<button type="button" data-f="${f.id}" aria-pressed="${i === 0}">${f.label}<small>${CALENDAR.filter(f.test).length}</small></button>`
  ).join('');
  const apply = (id) => {
    const f = FILTERS.find((x) => x.id === id);
    let shown = 0;
    $$('.crow').forEach((row) => {
      const c = CALENDAR.find((x) => `ronda-${x.r}` === row.id);
      const ok = f.test(c);
      row.hidden = !ok;
      if (ok) { shown++; row.style.opacity = ''; row.style.transform = ''; }
    });
    $$('.month').forEach((m) => { m.hidden = !$$('.crow:not([hidden])', m).length; });
    $$('button', box).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === id)));
    count.textContent = `${shown} GRANDES PREMIOS`;
    ScrollTrigger.refresh();
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (b) apply(b.dataset.f);
  });
  count.textContent = `${CALENDAR.length} GRANDES PREMIOS`;
}

/* Datos estructurados (schema.org) para buscadores */
function injectSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Calendario del Mundial de MotoGP ${SEASON.year}`,
    itemListElement: CALENDAR.map((c) => ({
      '@type': 'ListItem',
      position: c.r,
      item: {
        '@type': 'SportsEvent',
        name: `MotoGP ${SEASON.year} · GP de ${c.country}`,
        sport: 'Motociclismo',
        startDate: c.start,
        endDate: c.end,
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: c.circuit, address: { '@type': 'PostalAddress', addressLocality: c.city } },
      },
    })),
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

export function initPage(ctx) {
  injectSchema();
  renderStats();
  renderStrip();
  renderNext();
  renderList();
  bindFilters(ctx.ScrollTrigger);
  if (NEXT_RACE.round) startCountdown({
    gsap: ctx.gsap,
    target: NEXT_RACE.raceUTC,
    cells: { d: $('#cd-d'), h: $('#cd-h'), m: $('#cd-m'), s: $('#cd-s') },
    status: $('#cd-status'),
  });
  staggerIn(ctx, $$('.crow'), { y: 30, stagger: 0.05 });
}
