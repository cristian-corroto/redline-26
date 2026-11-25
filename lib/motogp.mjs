/* =========================================================
   Lectura de la API pública de resultados de MotoGP (la que usa motogp.com)
   y transformación al formato que pinta la web.

   - Resultados, poles y clasificaciones: /results/* (cronometraje oficial)
   - Hora de las sesiones: /events (horarios oficiales del fin de semana)
   ========================================================= */

const API = 'https://api.motogp.pulselive.com/motogp/v1';
const YEAR = 2026;

const CAT_NAME = { motogp: 'MotoGP™', moto2: 'Moto2™', moto3: 'Moto3™' };
const CAT_ACRONYM = { motogp: 'MGP', moto2: 'MT2', moto3: 'MT3' };
const PTS_PER_GP = { motogp: 37, moto2: 25, moto3: 25 }; // MotoGP: sprint 12 + carrera 25
const SPRINT_MAX = 12;

/* La API escribe los nombres sin tildes: se corrigen los conocidos */
const NAME_FIX = {
  'Marc Marquez': 'Marc Márquez',
  'Alex Marquez': 'Álex Márquez',
  'Jorge Martin': 'Jorge Martín',
  'Raul Fernandez': 'Raúl Fernández',
  'Fermin Aldeguer': 'Fermín Aldeguer',
  'Augusto Fernandez': 'Augusto Fernández',
  'Pol Espargaro': 'Pol Espargaró',
  'Aleix Espargaro': 'Aleix Espargaró',
  'Toprak Razgatlioglu': 'Toprak Razgatlıoğlu',
  'Manuel Gonzalez': 'Manuel González',
  'Ivan Ortola': 'Iván Ortolá',
  'Alonso Lopez': 'Alonso López',
  'Alex Escrig': 'Álex Escrig',
  'Adrian Huertas': 'Adrián Huertas',
  'Jose Antonio Rueda': 'José Antonio Rueda',
  'Angel Piqueras': 'Ángel Piqueras',
  'Alberto Ferrandez': 'Alberto Ferrández',
  'Aron Canet': 'Arón Canet',
  'Sergio Garcia': 'Sergio García',
  'Marcos Ramirez': 'Marcos Ramírez',
  'Filip Salac': 'Filip Salač',
  'Zonta Vd Goorbergh': 'Zonta van den Goorbergh',
  'Maximo Quiles': 'Máximo Quiles',
  'Alvaro Carpe': 'Álvaro Carpe',
  'Adrian Fernandez': 'Adrián Fernández',
  'Veda Pratama': 'Veda Ega Pratama',
  'Valentin Perrone': 'Valentín Perrone',
  'Adrian Cruces': 'Adrián Cruces',
  'Jesus Rios': 'Jesús Ríos',
  'David Gonzalez': 'David González',
  'Eduardo Gutierrez': 'Eduardo Gutiérrez',
  'Hector Garzo': 'Héctor Garzó',
  'Jaume Masia': 'Jaume Masià',
  'Ruben Garcia': 'Rubén García',
};

export const fixName = (n = '') => {
  const clean = String(n).trim().replace(/\s+/g, ' ');
  if (NAME_FIX[clean]) return NAME_FIX[clean];
  // O'shea -> O'Shea
  return clean.replace(/\bO'([a-z])/g, (_, c) => `O'${c.toUpperCase()}`);
};

/* ---------- red ---------- */
async function get(path, { retries = 2, timeout = 8000 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${API}${path}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

/* Ejecuta tareas con un máximo de peticiones simultáneas */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const classification = async (sessionId) =>
  (await get(`/results/session/${sessionId}/classification?test=false`)).classification || [];

/* "41:29.173" -> "41'29.173" */
const raceTime = (t) => (t ? String(t).replace(/^0?(\d+):/, "$1'") : '');

function gapLabel(row) {
  if (row.position === 1) return raceTime(row.time);
  const laps = Number(row.gap?.lap || 0);
  if (laps > 0) return `+${laps} vuelta${laps > 1 ? 's' : ''}`;
  return row.gap?.first ? `+${row.gap.first}` : '';
}

const rowOf = (r) => ({
  pos: r.position,
  name: fixName(r.rider?.full_name),
  team: r.team?.name || '',
  pts: r.points ?? 0,
  gap: gapLabel(r),
});

/* Fecha y hora en una zona horaria: { weekday:'DOMINGO', day:'22', month:'NOV', time:'13:00' } */
function partsIn(iso, timeZone) {
  const f = new Intl.DateTimeFormat('es-ES', {
    timeZone, weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return {
    weekday: p.weekday.toUpperCase(),
    day: p.day,
    month: p.month.replace('.', '').slice(0, 3).toUpperCase(),
    time: `${p.hour}:${p.minute}`,
  };
}

/* =========================================================
   Construcción de la temporada
   ========================================================= */
export async function buildSeason({ makersUntil = Infinity } = {}) {
  const seasons = await get('/results/seasons');
  const season = seasons.find((s) => s.year === YEAR);
  if (!season) throw new Error(`Temporada ${YEAR} no encontrada`);

  const [cats, rawEvents, schedule] = await Promise.all([
    get(`/results/categories?seasonUuid=${season.id}`),
    get(`/results/events?seasonUuid=${season.id}`),
    get(`/events?seasonYear=${YEAR}`).catch(() => []), // horarios: opcionales
  ]);

  const catId = {};
  for (const key of Object.keys(CAT_NAME)) {
    const c = cats.find((x) => x.name === CAT_NAME[key]);
    if (!c) throw new Error(`Categoría ${key} no encontrada`);
    catId[key] = c.id;
  }

  // Solo Grandes Premios (sin tests), ordenados por fecha = número de ronda
  const events = rawEvents
    .filter((e) => !e.test)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .map((e, i) => ({ ...e, r: i + 1 }));

  // Sesiones de MotoGP de cada GP ya empezado
  const started = events.filter((e) => e.status !== 'NOT-STARTED');
  const sessionsByEvent = {};
  await pool(started, 8, async (e) => {
    sessionsByEvent[e.id] = await get(`/results/sessions?eventUuid=${e.id}&categoryUuid=${catId.motogp}`);
  });

  // Con bandera roja y nueva salida hay varias sesiones del mismo tipo: vale la última
  const find = (sessions, type, number) =>
    (sessions || [])
      .filter((s) => s.type === type && (number == null || s.number === number))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .pop();
  const isDone = (s) => s && s.status === 'FINISHED';

  // Un GP cuenta como disputado cuando termina la carrera de MotoGP (o el evento entero)
  const completed = events.filter((e) => e.status === 'FINISHED' || isDone(find(sessionsByEvent[e.id], 'RAC')));
  const completedRounds = completed.length ? Math.max(...completed.map((e) => e.r)) : 0;

  // Ganador, fábrica y pole de cada GP + puntos de constructores (sprint y carrera)
  const makers = new Map();
  const addMakerPoints = (rows) => {
    const best = new Map();
    for (const r of rows) {
      const m = r.constructor?.name;
      if (!m || !r.position) continue;
      if (!best.has(m) || r.position < best.get(m).position) best.set(m, r);
    }
    for (const [m, r] of best) makers.set(m, (makers.get(m) || 0) + (r.points || 0));
  };

  const results = {};
  await pool(started, 6, async (e) => {
    const ss = sessionsByEvent[e.id];
    const q2 = find(ss, 'Q', 2);
    const spr = find(ss, 'SPR');
    const rac = find(ss, 'RAC');
    const [q2c, sprc, racc] = await Promise.all([
      isDone(q2) ? classification(q2.id) : [],
      isDone(spr) ? classification(spr.id) : [],
      isDone(rac) ? classification(rac.id) : [],
    ]);
    const win = racc.find((r) => r.position === 1);
    const pole = q2c.find((r) => r.position === 1);
    results[e.id] = {
      winner: win ? fixName(win.rider.full_name) : null,
      maker: win ? win.constructor?.name || null : null,
      pole: pole ? fixName(pole.rider.full_name) : null,
      cancelled: rac?.status === 'CANCELLED',
      sprintDone: isDone(spr),
      spr: sprc,
      rac: racc,
    };
  });
  for (const e of started.filter((x) => x.r <= makersUntil)) {
    addMakerPoints(results[e.id].spr);
    addMakerPoints(results[e.id].rac);
  }

  const calendar = events.map((e) => ({
    r: e.r,
    code: e.short_name,
    start: e.date_start,
    end: e.date_end,
    status: e.r <= completedRounds ? 'done' : 'todo',
    winner: results[e.id]?.winner ?? null,
    maker: results[e.id]?.maker ?? null,
    pole: results[e.id]?.pole ?? null,
    cancelled: Boolean(results[e.id]?.cancelled),
  }));

  // Próxima carrera: hora oficial de la carrera de MotoGP
  const nextEv = events.find((e) => e.r === completedRounds + 1) || null;
  let nextRace = null;
  if (nextEv) {
    const sch = schedule.find((x) => x.shortname === nextEv.short_name && x.kind === 'GP')
      || schedule.find((x) => x.date_start?.slice(0, 10) === nextEv.date_start);
    const rac = sch?.broadcasts?.find((b) => b.shortname === 'RAC' && b.category?.acronym === CAT_ACRONYM.motogp);
    if (rac?.date_start) {
      const utc = new Date(rac.date_start).toISOString().replace('.000Z', 'Z');
      const tz = sch.time_zone ? sch.time_zone.split('/').map((s) => s[0] + s.slice(1).toLowerCase()).join('/') : 'UTC';
      let local;
      try { local = partsIn(utc, tz); } catch { local = partsIn(utc, 'UTC'); }
      const es = partsIn(utc, 'Europe/Madrid');
      nextRace = {
        round: nextEv.r,
        raceUTC: utc,
        localLabel: `${local.weekday} ${local.day} ${local.month} · ${local.time} HORA LOCAL · ${es.time} EN ESPAÑA`,
        approx: false,
      };
    } else {
      nextRace = { round: nextEv.r, raceUTC: `${nextEv.date_end}T13:00:00Z`, localLabel: '', approx: true };
    }
  }

  // Puntos que quedan en juego
  const roundsLeft = events.length - completedRounds;
  const nextSprintDone = nextEv ? Boolean(results[nextEv.id]?.sprintDone) : false;
  const maxLeft = (cat) => Math.max(0, roundsLeft * PTS_PER_GP[cat] - (cat === 'motogp' && nextSprintDone ? SPRINT_MAX : 0));

  // Clasificaciones del Mundial
  const standings = {};
  await Promise.all(
    Object.keys(CAT_NAME).map(async (cat) => {
      const st = await get(`/results/standings?seasonUuid=${season.id}&categoryUuid=${catId[cat]}`);
      standings[cat] = {
        maxLeft: maxLeft(cat),
        riders: (st.classification || [])
          .filter((r) => r.position)
          .map((r) => ({
            pos: r.position,
            name: fixName(r.rider?.full_name),
            team: r.team?.name || '',
            pts: r.points ?? 0,
            wins: r.race_wins ?? 0,
          })),
      };
      if (!standings[cat].riders.length) throw new Error(`Clasificación vacía: ${cat}`);
    })
  );

  // Última carrera: top 10 de las tres categorías
  const lastEv = events.find((e) => e.r === completedRounds) || null;
  let lastRace = null;
  if (lastEv) {
    const top10 = async (cat) => {
      let rows;
      if (cat === 'motogp') rows = results[lastEv.id].rac;
      else {
        const ss = await get(`/results/sessions?eventUuid=${lastEv.id}&categoryUuid=${catId[cat]}`);
        const rac = find(ss, 'RAC');
        rows = isDone(rac) ? await classification(rac.id) : [];
      }
      return rows.filter((r) => r.position).sort((a, b) => a.position - b.position).slice(0, 10).map(rowOf);
    };
    const [motogp, moto2, moto3] = await Promise.all(['motogp', 'moto2', 'moto3'].map(top10));
    lastRace = {
      round: lastEv.r,
      code: lastEv.short_name,
      date: lastEv.date_end,
      place: lastEv.circuit?.place || '',
      pole: results[lastEv.id].pole,
      motogp,
      moto2,
      moto3,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    year: YEAR,
    totalRounds: events.length,
    completedRounds,
    calendar,
    nextRace,
    standings,
    constructors: [...makers].map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts),
    lastRace,
  };
}
