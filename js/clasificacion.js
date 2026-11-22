/* Página Clasificación: duelo por el título, tabla completa, cuentas del título y constructores */
import { SEASON, STANDINGS, LAST_RACE, CONSTRUCTORS } from './data.js';
import { $, esc, pad, fmtPts, prefersReducedMotion } from './utils.js';
import { CAT_COLOR, bindTabs, standingsRows, canWin, isDecided, tally, hbarsHTML, inView } from './shared.js';

const surname = (n) => n.split(' ').slice(1).join(' ');

/* "Márquez" a secas solo si no hay otro Márquez en la lista; si lo hay, "Á. Márquez" */
const shortNames = (riders) => {
  const count = {};
  riders.forEach((r) => { const s = surname(r.name); count[s] = (count[s] || 0) + 1; });
  return (r) => (count[surname(r.name)] > 1 ? `${r.name[0]}. ${surname(r.name)}` : surname(r.name) || r.name);
};

function renderStats() {
  const mg = STANDINGS.motogp.riders;
  const m3 = STANDINGS.moto3;
  $('#ph-stats').innerHTML = [
    [fmtPts(mg[0].pts), `Puntos de ${surname(mg[0].name)}`],
    [fmtPts(mg[0].pts - mg[1].pts), 'Puntos de ventaja en MotoGP'],
    [STANDINGS.motogp.maxLeft, 'Puntos aún en juego'],
    [fmtPts(m3.riders[0].pts), `${surname(m3.riders[0].name)}, ${isDecided('moto3') ? 'campeón' : 'líder'} de Moto3`],
  ]
    .map(([n, label]) => `<div><dt class="mono">${esc(label)}</dt><dd>${n}</dd></div>`)
    .join('');
}

function renderHead() {
  $('#ph-eyebrow').textContent = LAST_RACE.title
    ? `CAMPEONATO DEL MUNDO ${SEASON.year} · TRAS EL ${LAST_RACE.title.toUpperCase()}`
    : `CAMPEONATO DEL MUNDO ${SEASON.year}`;
  const story = (cat) => {
    const [a, b] = STANDINGS[cat].riders;
    const gap = a.pts - b.pts;
    if (isDecided(cat)) return `${a.name} ya es campeón de ${STANDINGS[cat].label}`;
    return `${a.name} lidera ${STANDINGS[cat].label} por ${fmtPts(gap)} punto${gap === 1 ? '' : 's'}`;
  };
  $('#ph-lead').textContent = `Tres campeonatos, tres historias: ${story('motogp')}; ${story('moto2')}; ${story('moto3')}.`;
}

function renderDuel() {
  const [a, b] = STANDINGS.motogp.riders;
  const wins = Object.fromEntries(tally('winner').map((r) => [r.name, r.n]));
  const poles = Object.fromEntries(tally('pole').map((r) => [r.name, r.n]));
  const last = Object.fromEntries(LAST_RACE.motogp.rows.map((r) => [r.name, r.pts]));
  const rows = [
    ['Puntos', a.pts, b.pts],
    ['Victorias', wins[a.name] || 0, wins[b.name] || 0],
    ['Poles', poles[a.name] || 0, poles[b.name] || 0],
    [`Puntos en ${LAST_RACE.title.replace('GP de ', '')}`, last[a.name] || 0, last[b.name] || 0],
  ];
  $('#duel-title').innerHTML = `${esc(surname(a.name))} <em>contra</em> ${esc(surname(b.name))}`;
  const rider = (r, tag) => `<div class="duel__r">
      <small class="mono">${pad(r.pos)} · ${tag} · ${esc(r.team)}</small>
      <p class="display duel__name">${esc(r.name.split(' ')[0])}<br>${esc(surname(r.name))}</p>
      <p class="display duel__pts">${fmtPts(r.pts)}</p>
    </div>`;
  $('#duel').insertAdjacentHTML(
    'beforeend',
    `<div class="duel__riders">
      ${rider(a, 'Líder')}
      <div class="duel__vs"><b>${fmtPts(a.pts - b.pts)}</b><small class="mono">puntos de<br>diferencia</small></div>
      ${rider(b, 'Perseguidor')}
    </div>
    <div class="duel__rows">
      ${rows
        .map(([k, l, r]) => {
          const m = Math.max(l, r) || 1;
          return `<div class="drow">
            <span class="drow__v">${fmtPts(l)}</span>
            <span class="drow__bar drow__bar--l" aria-hidden="true"><i style="--w:${(l / m).toFixed(4)}"></i></span>
            <span class="drow__k mono">${esc(k)}</span>
            <span class="drow__bar drow__bar--r" aria-hidden="true"><i style="--w:${(r / m).toFixed(4)}"></i></span>
            <span class="drow__v">${fmtPts(r)}</span>
          </div>`;
        })
        .join('')}
    </div>`
  );
}

/* Barras: puntos actuales + máximo alcanzable, con la línea del líder */
function mathHTML(cat) {
  const { riders, maxLeft } = STANDINGS[cat];
  const lead = riders[0].pts;
  const decided = isDecided(cat);
  const alive = riders.filter((r) => canWin(cat, r.pts));
  const shown = riders.slice(0, Math.min(riders.length, Math.max(alive.length + 2, 6)));
  const scale = Math.max(...shown.map((r) => r.pts + maxLeft));
  const short = shortNames(shown);
  const rows = shown
    .map((r, i) => {
      const ok = r === riders[0] || (!decided && canWin(cat, r.pts));
      const top = r.pts + maxLeft;
      return `<div class="math__row ${ok ? '' : 'is-out'}" style="--i:${i}">
        <b>${esc(short(r))}<small>${fmtPts(r.pts)} → máx. ${fmtPts(top)}${ok ? '' : ' · fuera'}</small></b>
        <span class="math__track" aria-hidden="true">
          <i class="math__max" style="--max:${(top / scale).toFixed(4)}"></i>
          <i class="math__now" style="--now:${(r.pts / scale).toFixed(4)}"></i>
        </span>
      </div>`;
    })
    .join('');
  const line = `<span class="math__lines" aria-hidden="true"><i class="math__line" style="left:${((lead / scale) * 100).toFixed(2)}%"><span class="mono">Líder ${fmtPts(lead)}</span></i></span>`;
  let verdict;
  if (decided) verdict = `${esc(surname(riders[0].name))}, <em>campeón</em>: nadie puede alcanzar sus ${fmtPts(lead)} puntos`;
  else verdict = `<em>${alive.length} pilotos</em> aún pueden ser campeones con ${maxLeft} puntos en juego`;
  return { rows: rows + line, verdict };
}

function bindStandings(gsap, ScrollTrigger) {
  const list = $('#st-list');
  const math = $('#math');
  bindTabs($('#st-tabs'), (cat) => {
    const { rows, verdict } = mathHTML(cat);
    list.innerHTML = standingsRows(cat, { badges: true });
    $('#st-panel').style.setProperty('--sc', CAT_COLOR[cat]);
    list.style.setProperty('--sc', CAT_COLOR[cat]);
    $('#st-source').textContent = STANDINGS[cat].source;
    $('#st-max').textContent = `Máx. restante: ${STANDINGS[cat].maxLeft} pts`;
    math.innerHTML = rows;
    $('#math-verdict').innerHTML = verdict;
    // al cambiar de pestaña con la sección ya vista, las barras se redibujan
    [list, math].forEach((el) => {
      if (el.dataset.seen !== '1') return;
      el.classList.remove('is-in');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    });
    if (!prefersReducedMotion() && list.dataset.seen === '1') gsap.from('#st-list .srow', { opacity: 0, x: -24, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
    ScrollTrigger.refresh();
  });
  [list, math].forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => { el.dataset.seen = '1'; el.classList.add('is-in'); } })
  );
}

function renderMakers(ScrollTrigger) {
  const el = $('#makers');
  el.innerHTML = hbarsHTML(CONSTRUCTORS.rows.map((r) => ({ name: r.name, n: r.pts })));
  $('#makers-src').textContent = CONSTRUCTORS.source;
  inView(ScrollTrigger, el);
}

export function initPage({ gsap, ScrollTrigger }) {
  renderHead();
  renderStats();
  renderDuel();
  inView(ScrollTrigger, $('#duel'));
  bindStandings(gsap, ScrollTrigger);
  renderMakers(ScrollTrigger);
}
