/* Piezas compartidas entre la home y las páginas internas */
import { SEASON, CALENDAR, STANDINGS, LAST_RACE } from './data.js';
import { $, $$, esc, pad, fmtPts, corners, prefersReducedMotion } from './utils.js';

export const CATS = ['motogp', 'moto2', 'moto3'];
export const CAT_COLOR = { motogp: 'var(--accent)', moto2: 'var(--accent-2)', moto3: 'var(--accent-3)' };

/* ---------- Derivados del calendario ---------- */
export const raceStatus = (c) =>
  c.r <= SEASON.completedRounds ? 'done' : c.r === SEASON.completedRounds + 1 ? 'next' : 'todo';

/* Cuenta por clave (piloto, fábrica…) ordenada de más a menos */
export function tally(key) {
  const map = new Map();
  CALENDAR.forEach((c) => { if (c[key]) map.set(c[key], (map.get(c[key]) || 0) + 1); });
  return [...map].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'es'));
}

/* ¿Sigue vivo matemáticamente? (puntos + máximo restante alcanzan al líder) */
export const canWin = (cat, pts) => {
  const { riders, maxLeft } = STANDINGS[cat];
  return pts + maxLeft >= riders[0].pts;
};
export const isDecided = (cat) => {
  const { riders, maxLeft } = STANDINGS[cat];
  return riders[1].pts + maxLeft < riders[0].pts;
};

/* ---------- Tabs accesibles (flechas, Inicio, Fin) ---------- */
export function bindTabs(root, onChange, initial = 'motogp') {
  const tabs = $$('[role="tab"]', root);
  const select = (cat, focus) => {
    tabs.forEach((t) => {
      const on = t.dataset.cat === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    onChange(cat);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.cat));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      const n = k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[n].dataset.cat, true);
    });
  });
  select(initial);
}

export const tabsHTML = (id, label) => `
  <div class="tabs" id="${id}" role="tablist" aria-label="${esc(label)}">
    ${CATS.map((c, i) => `<button role="tab" id="${id}-${c}" data-cat="${c}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''}>${STANDINGS[c].label}</button>`).join('')}
  </div>`;

/* ---------- Clasificación ---------- */
export function standingsRows(cat, { limit = Infinity, badges = false } = {}) {
  const { riders } = STANDINGS[cat];
  const lead = riders[0].pts;
  const decided = isDecided(cat);
  return riders
    .slice(0, limit)
    .map((r, i) => {
      const gap = i === 0 ? (decided ? 'CAMPEÓN' : 'LÍDER') : `−${fmtPts(lead - r.pts)}`;
      let badge = '';
      if (badges) {
        if (i === 0 && decided) badge = '<span class="tag tag--gold mono">Campeón</span>';
        else if (!decided && canWin(cat, r.pts)) badge = '<span class="tag mono">Opta al título</span>';
      }
      return `<li class="srow" style="--w:${(r.pts / lead).toFixed(4)};--i:${i}">
        <span class="srow__pos mono">${pad(r.pos)}</span>
        <span class="srow__name"><b>${esc(r.name)}</b><small class="mono">${esc(r.team) || '&nbsp;'}</small>${badge}</span>
        <span class="srow__bar" aria-hidden="true"><i></i></span>
        <span class="srow__pts"><b class="display">${fmtPts(r.pts)}</b><small class="mono">${gap}</small></span>
      </li>`;
    })
    .join('');
}

/* ---------- Última carrera ---------- */
export function lastRaceHTML(cat, { partialNote = '' } = {}) {
  const d = LAST_RACE[cat];
  if (d.rows && !d.rows.length) return `<p class="lr-partial mono">${esc(d.note)}</p>`;
  if (d.rows) {
    return `<ol class="lr-table">${d.rows
      .map(
        (r) => `<li class="lrow ${r.pos <= 3 ? 'is-podium' : ''}" style="--i:${r.pos - 1}">
          <span class="lrow__pos display">${pad(r.pos)}</span>
          <span class="lrow__name"><b>${esc(r.name)}</b><small class="mono">${esc(r.team)}</small></span>
          <span class="lrow__gap mono">${esc(r.gap)}</span>
          <span class="lrow__pts mono">+${r.pts}</span>
        </li>`
      )
      .join('')}</ol>`;
  }
  const order = [d.podium[1], d.podium[0], d.podium[2]]; // 2.º · 1.º · 3.º
  return `<div class="podium">${order
    .map(
      (p) => `<div class="podium__step podium__step--${p.pos} glass" style="--i:${p.pos}">
        ${corners()}
        <span class="podium__pos display">${p.pos}</span>
        <b class="podium__name display">${esc(p.name)}</b>
        <small class="mono">${esc(p.team) || '&nbsp;'}</small>
      </div>`
    )
    .join('')}</div>
  ${partialNote ? `<p class="lr-partial mono">${partialNote}</p>` : ''}`;
}

/* ---------- Barras horizontales (una sola serie; el valor siempre va escrito) ---------- */
export function hbarsHTML(rows, { sub, fmt = String, max } = {}) {
  const top = max ?? Math.max(...rows.map((r) => r.n));
  return rows
    .map(
      (r, i) => `<li class="hbar" style="--w:${(r.n / top).toFixed(4)};--i:${i}">
        <span class="hbar__l">${esc(r.name)}${sub ? `<small>${esc(sub(r))}</small>` : ''}</span>
        <span class="hbar__t" aria-hidden="true"><i></i></span>
        <span class="hbar__v">${fmt(r.n)}</span>
      </li>`
    )
    .join('');
}

/* ---------- Cuenta atrás ---------- */
export function startCountdown({ gsap, target, cells, status }) {
  const t = new Date(target).getTime();
  const reduce = prefersReducedMotion();
  const set = (el, val) => {
    if (el.textContent === val) return;
    el.textContent = val;
    if (!reduce && gsap) gsap.fromTo(el, { yPercent: 25, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
  };
  const tick = () => {
    let diff = Math.floor((t - Date.now()) / 1000);
    if (diff <= 0) {
      Object.values(cells).forEach((c) => { c.textContent = '00'; });
      // una carrera de MotoGP dura ~45 min: tras 2 h se da por disputada
      if (status) status.textContent = diff > -7200 ? '● CARRERA EN CURSO' : 'CARRERA DISPUTADA · RESULTADOS EN BREVE';
      return diff > -7200;
    }
    const d = Math.floor(diff / 86400); diff -= d * 86400;
    const h = Math.floor(diff / 3600); diff -= h * 3600;
    const m = Math.floor(diff / 60);
    set(cells.d, pad(d)); set(cells.h, pad(h)); set(cells.m, pad(m)); set(cells.s, pad(diff - m * 60));
    return true;
  };
  if (!tick()) return;
  const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
}

/* Entrada escalonada de una lista cuando aparece en pantalla */
export function staggerIn({ gsap, ScrollTrigger }, items, { y = 40, stagger = 0.06 } = {}) {
  if (!document.documentElement.classList.contains('js-anim') || !items.length) return;
  gsap.set(items, { opacity: 0, y });
  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger, ease: 'power3.out', overwrite: true }),
  });
}

/* Añade la clase .is-in cuando el elemento entra (para transiciones CSS) */
export function inView(ScrollTrigger, el, start = 'top 85%') {
  if (!el) return;
  ScrollTrigger.create({ trigger: el, start, once: true, onEnter: () => el.classList.add('is-in') });
}
