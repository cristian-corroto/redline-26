/* Página Resultados: última carrera, reparto de victorias/poles y carrera a carrera */
import { SEASON, CALENDAR, LAST_RACE } from './data.js';
import { $, $$, esc, pad, fmtRange, corners, prefersReducedMotion } from './utils.js';
import { CAT_COLOR, bindTabs, lastRaceHTML, raceStatus, tally, hbarsHTML, staggerIn, inView } from './shared.js';

const done = () => CALENDAR.filter((c) => raceStatus(c) === 'done');

function renderHead() {
  $('#ph-ghost').textContent = pad(SEASON.completedRounds);
  $('#ph-eyebrow').textContent = `TEMPORADA ${SEASON.year} · TRAS ${SEASON.completedRounds} DE ${SEASON.totalRounds} GRANDES PREMIOS`;
}

function renderStats() {
  const riders = tally('winner');
  const makers = tally('maker');
  const top = riders[0];
  const surname = (n) => n.split(' ').slice(-1)[0];
  $('#ph-stats').innerHTML = [
    [SEASON.completedRounds, 'Carreras disputadas'],
    [riders.length, 'Ganadores distintos'],
    [top.n, `Victorias de ${surname(top.name)}`],
    [makers.map((m) => m.n).join('–'), makers.map((m) => m.name).join(' · ')],
  ]
    .map(([n, label]) => `<div><dt class="mono">${esc(label)}</dt><dd>${n}</dd></div>`)
    .join('');
}

function renderLast(gsap) {
  const panel = $('#lr-panel');
  $('#lr-eyebrow').textContent = `ÚLTIMA CARRERA · RONDA ${LAST_RACE.round}/${SEASON.totalRounds} · ${LAST_RACE.dateLabel}`;
  $('#lr-title').innerHTML = `${esc(LAST_RACE.title)} <em>en ${esc(LAST_RACE.place)}</em>`;
  bindTabs($('#lr-tabs'), (cat) => {
    panel.innerHTML = lastRaceHTML(cat, { partialNote: 'Solo podio verificado de la carrera' });
    panel.style.setProperty('--sc', CAT_COLOR[cat]);
    $('#lr-note').textContent = LAST_RACE[cat].note;
    $('#lr-source').textContent = LAST_RACE[cat].source;
    if (!prefersReducedMotion()) gsap.from('#lr-panel > *', { opacity: 0, y: 20, duration: 0.55, stagger: 0.05, ease: 'power3.out' });
  });
}

function renderShare(ScrollTrigger) {
  const races = done();
  const roundsOf = (key, name) => races.filter((c) => c[key] === name).map((c) => `R${c.r}`).join(' · ');
  const riders = tally('winner');
  const poles = tally('pole');
  $('#rep-riders').innerHTML = hbarsHTML(riders, { sub: (r) => roundsOf('winner', r.name) });
  const raced = races.filter((c) => c.winner).length;
  const off = races.length - raced;
  $('#rep-riders-n').textContent = off ? `${raced} carreras · ${off} cancelada${off > 1 ? 's' : ''}` : `${raced} carreras`;
  $('#rep-makers').innerHTML = hbarsHTML(tally('maker'));
  $('#rep-poles').innerHTML = hbarsHTML(poles, { sub: (r) => roundsOf('pole', r.name) });
  $('#rep-poles-n').textContent = `${poles.reduce((a, p) => a + p.n, 0)} poles`;
  $$('#reparto .hbars').forEach((el) => inView(ScrollTrigger, el));
}

function renderWins() {
  const races = done();
  $('#wins').innerHTML = races
    .map(
      (c) => `<li class="win glass ${c.r === SEASON.completedRounds ? 'is-latest' : ''}">
        ${corners()}
        <p class="win__top mono"><b>R${pad(c.r)}</b><span>${fmtRange(c.start, c.end)}</span></p>
        <h3 class="display win__gp">${esc(c.country)}</h3>
        <p class="win__circuit">${esc(c.circuit)}</p>
        <dl>
          <div><dt class="mono">Ganador</dt><dd class="${c.winner ? '' : 'is-na'}">${esc(c.winner || (c.cancelled ? 'Carrera cancelada' : 'Sin dato'))}${c.maker ? `<small>${esc(c.maker)}</small>` : ''}</dd></div>
          <div><dt class="mono">Pole</dt><dd class="${c.pole ? '' : 'is-na'}">${esc(c.pole || 'Sin dato')}</dd></div>
        </dl>
      </li>`
    )
    .join('');
}

export function initPage(ctx) {
  renderHead();
  renderStats();
  renderLast(ctx.gsap);
  renderShare(ctx.ScrollTrigger);
  renderWins();
  staggerIn(ctx, $$('.win'), { y: 40, stagger: 0.06 });
}
