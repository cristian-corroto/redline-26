/* =========================================================
   Datos en vivo: descarga /api/season y rellena js/data.js
   Orden de preferencia: API → copia del navegador → js/snapshot.js
   ========================================================= */
import {
  SEASON, CALENDAR, NEXT_RACE, STANDINGS, CONSTRUCTORS, LAST_RACE, SCENES, FIGURES, MARQUEE, PHRASES,
} from './data.js';
import snapshot from './snapshot.js';
import { fmtPts } from './utils.js';

const KEY = 'rl-season-v1';
const FRESH_MS = 5 * 60 * 1000; // copia del navegador válida 5 min (navegar entre páginas sin esperas)
const TIMEOUT_MS = 5000;
const CATS = ['motogp', 'moto2', 'moto3'];

const valid = (d) =>
  d && d.year === SEASON.year && Array.isArray(d.calendar) && d.calendar.length === CALENDAR.length &&
  CATS.every((c) => d.standings?.[c]?.riders?.length);

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
};
const writeCache = (data) => {
  try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data })); } catch {}
};

async function fetchLive() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/season', { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const newer = (a, b) => (a.generatedAt || '') >= (b.generatedAt || '');

export async function loadSeason() {
  const cached = readCache();
  let data = null;
  let source = 'snapshot';

  if (cached && valid(cached.data) && Date.now() - cached.t < FRESH_MS) {
    data = cached.data;
    source = 'live';
  } else {
    try {
      const live = await fetchLive();
      if (valid(live)) { data = live; source = 'live'; writeCache(live); }
    } catch (err) {
      console.warn('[REDLINE] Datos en vivo no disponibles:', err.message);
    }
    if (!data && cached && valid(cached.data)) { data = cached.data; source = 'cache'; }
  }
  // nunca mostrar algo más antiguo que la copia incluida en la web
  if (!data || !newer(data, snapshot)) { data = snapshot; source = 'snapshot'; }

  apply(data, source);
  return source;
}

/* =========================================================
   Volcado a las estructuras de data.js
   ========================================================= */
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const dateLabel = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const dotDate = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}·${p(d.getMonth() + 1)}·${d.getFullYear()}`;
};

function apply(d, source) {
  SEASON.completedRounds = d.completedRounds;
  SEASON.totalRounds = d.totalRounds;
  SEASON.asOf = d.generatedAt;
  SEASON.asOfLabel = dotDate(d.generatedAt);
  SEASON.source = source;

  d.calendar.forEach((c) => {
    const gp = CALENDAR.find((x) => x.r === c.r);
    if (!gp) return;
    // las fechas oficiales mandan (aplazamientos)
    if (c.start) gp.start = c.start;
    if (c.end) gp.end = c.end;
    gp.winner = c.winner;
    gp.maker = c.maker;
    gp.pole = c.pole;
    gp.cancelled = Boolean(c.cancelled);
  });

  Object.assign(NEXT_RACE, d.nextRace || { round: null, raceUTC: '', localLabel: '', approx: false });

  const last = CALENDAR.find((c) => c.r === d.completedRounds);
  const lastName = last ? `GP de ${last.country}` : '';
  SEASON.lastRaceLabel = last ? `${lastName} · ${last.city}` : 'inicio de temporada';

  CATS.forEach((cat) => {
    const s = d.standings[cat];
    STANDINGS[cat].riders = s.riders;
    STANDINGS[cat].maxLeft = s.maxLeft;
    STANDINGS[cat].source = `motogp.com · clasificación oficial${last ? ` tras el ${lastName}` : ''}`;
  });

  CONSTRUCTORS.rows = d.constructors;
  CONSTRUCTORS.source = 'Calculado con los resultados oficiales de sprints y carreras (motogp.com)';

  if (d.lastRace && last) {
    Object.assign(LAST_RACE, {
      round: d.lastRace.round,
      title: lastName,
      circuit: last.circuit,
      place: last.city,
      dateLabel: dateLabel(d.lastRace.date),
    });
    CATS.forEach((cat) => {
      LAST_RACE[cat] = {
        rows: d.lastRace[cat] || [],
        source: 'motogp.com · clasificación oficial de la carrera',
        note: raceNote(cat, d.lastRace[cat] || [], last),
      };
    });
  }

  write(SCENES, buildScenes());
  write(FIGURES, buildFigures());
  write(MARQUEE, buildMarquee());
  write(PHRASES, buildPhrases());
}

const write = (arr, items) => { arr.length = 0; arr.push(...items); };

/* =========================================================
   Textos generados a partir de los datos
   ========================================================= */
const WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const ORD = ['', 'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const word = (n) => (Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : fmtPts(n));
const ordinal = (n) => ORD[n] || `${n}.ª`;

/* 2 -> "Dos puntos" · 1 -> "Un punto" · 5.5 -> "Cinco puntos y medio" · 64 -> "64 puntos" */
function pointsPhrase(n) {
  const whole = Math.floor(n);
  const half = n - whole === 0.5;
  if (whole === 1 && !half) return 'Un punto';
  const w = whole < WORDS.length ? word(whole) : String(whole);
  return `${cap(w)} puntos${half ? ' y medio' : ''}`;
}

const SURNAME = { 'José Antonio Rueda': 'Rueda', 'Veda Ega Pratama': 'Pratama' };
const surname = (n) => SURNAME[n] || n.split(' ').slice(1).join(' ') || n;

const decided = (cat) => {
  const { riders, maxLeft } = STANDINGS[cat];
  return riders.length > 1 && riders[1].pts + maxLeft < riders[0].pts;
};
const roundsLeft = () => SEASON.totalRounds - SEASON.completedRounds;

function raceNote(cat, rows, gp) {
  if (!rows.length) {
    return gp.cancelled && cat === 'motogp'
      ? 'Carrera cancelada: solo se disputó el sprint del sábado.'
      : 'Carrera sin clasificación oficial.';
  }
  const win = rows[0].name;
  let n;
  if (cat === 'motogp') n = CALENDAR.filter((c) => c.r <= gp.r && c.winner === win).length;
  else n = STANDINGS[cat].riders.find((r) => r.name === win)?.wins || 0;
  let note = n ? `${ordinal(n)} victoria del año para ${win}` : `Victoria para ${win}`;
  if (cat === 'motogp' && gp.pole === win) note += ', desde la pole';
  note += '.';
  if (decided(cat)) note += ` ${STANDINGS[cat].riders[0].name} ya es campeón del mundo.`;
  return note;
}

const KICKER = { motogp: 'CATEGORÍA REINA', moto2: 'CATEGORÍA INTERMEDIA', moto3: 'CATEGORÍA LIGERA' };
const COLOR = { motogp: 'var(--accent)', moto2: 'var(--accent-2)', moto3: 'var(--accent-3)' };

function buildScenes() {
  return CATS.map((cat) => {
    const { riders, maxLeft } = STANDINGS[cat];
    const [a, b, c] = riders;
    const gap = a.pts - b.pts;
    const done = decided(cat);
    let headline;
    if (done) headline = `${surname(a.name)}, <em>campeón del mundo</em>`;
    else if (gap === 0) headline = 'Empate <em>en cabeza</em>';
    else if (gap <= 10) headline = `${pointsPhrase(gap)} ${gap === 1 ? 'separa' : 'separan'} <em>la gloria</em>`;
    else headline = `${surname(a.name)} manda <em>por ${fmtPts(gap)} puntos</em>`;

    let fact;
    if (done) fact = a.wins ? `Título asegurado con ${a.wins} victoria${a.wins > 1 ? 's' : ''}` : 'Título asegurado';
    else if (cat === 'motogp') fact = `Quedan ${roundsLeft()} GP y hasta ${maxLeft} puntos en juego`;
    else fact = `${surname(b.name)}, a ${fmtPts(gap)} puntos con ${maxLeft} en juego`;

    return {
      key: cat,
      color: COLOR[cat],
      label: STANDINGS[cat].label,
      kicker: KICKER[cat],
      headline,
      leaderTag: done ? 'CAMPEÓN' : 'LÍDER',
      leader: { name: a.name, team: a.team, pts: a.pts },
      rivals: [b, c].filter(Boolean).map((r) => ({ name: r.name, pts: r.pts })),
      fact,
    };
  });
}

function buildFigures() {
  const left = roundsLeft();
  const next = CALENDAR.find((c) => c.r === SEASON.completedRounds + 1);
  const lastGp = CALENDAR[CALENDAR.length - 1];
  const done = CALENDAR.find((c) => c.r === SEASON.completedRounds);
  return [
    { n: SEASON.totalRounds, label: 'Grandes Premios', sub: 'récord histórico' },
    { n: SEASON.completedRounds, label: 'Disputados', sub: done ? `hasta ${done.city}` : 'aún sin empezar' },
    { n: left, label: 'Por disputar', sub: left > 1 ? `${next.country} → ${lastGp.country}` : left === 1 ? `solo queda ${lastGp.country}` : 'temporada cerrada' },
    { n: STANDINGS.motogp.maxLeft, label: 'Puntos en juego', sub: 'en MotoGP' },
  ];
}

function buildMarquee() {
  const out = [`RONDA ${SEASON.completedRounds} / ${SEASON.totalRounds}`];
  const mg = LAST_RACE.motogp.rows[0];
  if (mg) out.push(`${surname(mg.name)} GANA EN ${LAST_RACE.place}`);
  else if (LAST_RACE.title) out.push(`CARRERA CANCELADA EN ${LAST_RACE.place}`);
  CATS.forEach((cat) => {
    const [a, b] = STANDINGS[cat].riders;
    if (decided(cat)) out.push(`${surname(a.name)}, CAMPEÓN DEL MUNDO DE ${STANDINGS[cat].label}`);
    else out.push(`${surname(a.name)} LIDERA ${STANDINGS[cat].label} POR ${fmtPts(a.pts - b.pts)} PUNTOS`);
  });
  const left = roundsLeft();
  out.push(left ? `QUEDAN ${left} GRANDES PREMIOS` : 'TEMPORADA FINALIZADA');
  return out.map((s) => s.toUpperCase());
}

/* Frases rotatorias del hero: [html, texto para lectores de pantalla] */
function buildPhrases() {
  const left = roundsLeft();
  const out = [[`${SEASON.completedRounds} de ${SEASON.totalRounds} <em>carreras</em>`, `Ronda ${SEASON.completedRounds} de ${SEASON.totalRounds} disputada.`]];
  out.push(left
    ? [`${left === 1 ? 'Queda' : 'Quedan'} <em>${word(left)}</em> GP`, `${left === 1 ? 'Queda un Gran Premio' : `Quedan ${left} Grandes Premios`}.`]
    : ['Temporada <em>cerrada</em>', 'La temporada ha terminado.']);
  const [a, b] = STANDINGS.motogp.riders;
  const gap = a.pts - b.pts;
  if (decided('motogp')) out.push([`${surname(a.name)}, <em>campeón</em>`, `${a.name} es campeón de MotoGP.`]);
  else if (gap <= 20) out.push([`${pointsPhrase(gap)} <em>de diferencia</em>`, `En MotoGP hay ${fmtPts(gap)} puntos entre ${a.name} y ${b.name}.`]);
  else out.push([`${surname(a.name)} <em>al frente</em>`, `${a.name} lidera MotoGP con ${fmtPts(gap)} puntos de ventaja.`]);
  ['moto3', 'moto2'].forEach((cat) => {
    const r = STANDINGS[cat].riders[0];
    if (decided(cat)) out.push([`${surname(r.name)}, <em>campeón</em>`, `${r.name} es campeón de ${STANDINGS[cat].label}.`]);
  });
  if (out.length < 4) {
    const r = STANDINGS.moto2.riders[0];
    out.push([`${surname(r.name)} <em>lidera Moto2</em>`, `${r.name} lidera Moto2.`]);
  }
  return out.map(([html, text]) => ({ html, text }));
}
