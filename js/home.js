/* Home cinematográfica: render de datos + animaciones de scroll */
import {
  SEASON, CALENDAR, NEXT_RACE, STANDINGS, LAST_RACE, SCENES, FIGURES, MARQUEE, PHRASES,
} from './data.js';
import { $, $$, esc, pad, fmtPts, fmtRange, corners, prefersReducedMotion } from './utils.js';
import { countUp, initCounters } from './effects.js';
import { CAT_COLOR, bindTabs, standingsRows, lastRaceHTML, startCountdown } from './shared.js';

/* =========================================================
   RENDER
   ========================================================= */

/* Textos del hero que dependen de los datos */
function renderHeroText() {
  $('#hud-round').innerHTML = `<i class="dot"></i>TELEMETRÍA · RONDA ${SEASON.completedRounds} / ${SEASON.totalRounds}`;
  const hud = $('#hud-asof');
  hud.textContent = SEASON.source === 'live' ? `DATOS OFICIALES · ${SEASON.asOfLabel}` : `DATOS A ${SEASON.asOfLabel}`;
  hud.title = SEASON.source === 'live' ? 'Datos en vivo de motogp.com' : 'Copia guardada: los datos en vivo no están disponibles ahora';
  $('#hero-phrases').innerHTML = PHRASES.map((p) => `<p class="phrase">${p.html}</p>`).join('');
  $('#hero-sr').textContent = PHRASES.map((p) => p.text).join(' ');

  const left = SEASON.totalRounds - SEASON.completedRounds;
  $('#rem-eyebrow').textContent = left
    ? `CALENDARIO · ${left === 1 ? 'QUEDA 1 GRAN PREMIO' : `QUEDAN ${left} GRANDES PREMIOS`}`
    : 'CALENDARIO · TEMPORADA FINALIZADA';
  const [a, b] = STANDINGS.motogp.riders;
  const open = ['motogp', 'moto2', 'moto3'].filter((c) => {
    const r = STANDINGS[c].riders;
    return r[1].pts + STANDINGS[c].maxLeft >= r[0].pts;
  }).length;
  const titles = open === 0 ? 'los tres títulos decididos' : open === 1 ? 'un título en juego' : `${open} títulos en juego`;
  $('#cta-sub').textContent = left
    ? `${left === 1 ? 'Un Gran Premio' : `${left} Grandes Premios`}, ${titles} y ${fmtPts(a.pts - b.pts)} puntos entre ${a.name} y ${b.name}.`
    : `Temporada cerrada: ${a.name}, campeón de MotoGP con ${fmtPts(a.pts)} puntos.`;
}

/* Temporada terminada: la cuenta atrás se sustituye por el campeón */
function renderSeasonOver() {
  const champ = STANDINGS.motogp.riders[0];
  $('#cd-eyebrow').textContent = `TEMPORADA ${SEASON.year} · ${SEASON.totalRounds}/${SEASON.totalRounds} GP`;
  $('#cd-title').innerHTML = 'Temporada <em>cerrada</em>';
  $('#cd-meta').textContent = `CAMPEÓN DE MOTOGP: ${champ.name.toUpperCase()} · ${fmtPts(champ.pts)} PUNTOS`;
  const grid = $('.cd__grid');
  if (grid) grid.hidden = true;
  $('#cd-rail').innerHTML = '';
}

function renderCountdown() {
  const race = CALENDAR.find((c) => c.r === NEXT_RACE.round);
  if (!race) return renderSeasonOver();
  const h2 = $('#cd-title');
  h2.innerHTML = `GP de <em>${esc(race.country)}</em>`;
  $('#cd-eyebrow').textContent = `PRÓXIMA PARADA · RONDA ${race.r}/${SEASON.totalRounds}`;
  $('#cd-meta').innerHTML =
    `${esc(race.circuit.toUpperCase())} · ${fmtRange(race.start, race.end)}` +
    (NEXT_RACE.approx ? ' · <span class="warn">HORA APROXIMADA</span>' : ` · ${esc(NEXT_RACE.localLabel)}`);

  const rail = $('#cd-rail');
  const left = CALENDAR.filter((c) => c.r >= NEXT_RACE.round);
  rail.innerHTML = left
    .map(
      (c, i) => `<li class="${i === 0 ? 'is-next' : ''}">
        <span class="rail__dot" aria-hidden="true"></span>
        <b class="mono">${pad(c.r)}</b>
        <span class="rail__name">${esc(c.country)}</span>
        <small class="mono">${fmtRange(c.start, c.end)}</small>
      </li>`
    )
    .join('');
}

function sceneHTML(s, i) {
  const max = s.leader.pts;
  const bars = [s.leader, ...s.rivals]
    .map(
      (r, k) => `<li style="--w:${(r.pts / max).toFixed(4)};--k:${k}">
        <span class="mono">${pad(k + 1)}</span>
        <b>${esc(r.name)}</b>
        <span class="bar"><i></i></span>
        <em>${fmtPts(r.pts)}</em>
      </li>`
    )
    .join('');
  const gap = s.leader.pts - s.rivals[0].pts;
  return `
  <article class="scene" data-scene="${i}" style="--sc:${s.color}" aria-label="${esc(s.label)}">
    <div class="scene__left">
      <p class="mono scene__kicker"><i class="dot"></i>${esc(s.kicker)}</p>
      <h2 class="display scene__label" aria-hidden="true">${esc(s.label)}</h2>
      <p class="display scene__headline">${s.headline}</p>
      <p class="mono scene__fact">${esc(s.fact)}</p>
    </div>
    <div class="scene__right">
      <div class="glass scene__card">
        ${corners()}
        <p class="mono scene__tag"><span>${esc(s.leaderTag)}</span><span>${pad(i + 1)} / ${pad(SCENES.length)}</span></p>
        <p class="display scene__leader">${esc(s.leader.name)}</p>
        <p class="mono scene__team">${esc(s.leader.team)}</p>
        <p class="scene__pts"><span class="display" data-count="${s.leader.pts}" data-decimals="${Number.isInteger(s.leader.pts) ? 0 : 1}" data-count-manual>${fmtPts(s.leader.pts)}</span><small class="mono">PTS</small></p>
        <p class="mono scene__gap">VENTAJA SOBRE EL 2.º: <b>+${fmtPts(gap)}</b></p>
        <ul class="scene__bars">${bars}</ul>
      </div>
    </div>
  </article>`;
}

function renderScenes() {
  $('#scenes-list').innerHTML = SCENES.map(sceneHTML).join('');
  $('#scenes-bg').innerHTML = SCENES.map((s, i) => `<i data-bg="${i}" style="--c:${s.color}"></i>`).join('');
}

function renderStandings() {
  const panel = $('#st-list');
  const src = $('#st-source');
  const max = $('#st-max');
  const show = (cat) => {
    panel.innerHTML = standingsRows(cat, { limit: 10 });
    panel.style.setProperty('--sc', CAT_COLOR[cat]);
    src.textContent = STANDINGS[cat].source;
    max.textContent = `Máx. restante: ${STANDINGS[cat].maxLeft} pts`;
    // las barras se animan cuando la lista ya se ha visto en pantalla
    if (panel.dataset.seen === '1') requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-in')));
  };
  return show;
}

function renderLastRace() {
  const panel = $('#lr-panel');
  const note = $('#lr-note');
  const src = $('#lr-source');
  const show = (cat) => {
    panel.innerHTML = lastRaceHTML(cat, { partialNote: 'Solo podio verificado · más datos en <a href="resultados.html" data-title="Resultados">Resultados ↗</a>' });
    panel.style.setProperty('--sc', CAT_COLOR[cat]);
    note.textContent = LAST_RACE[cat].note;
    src.textContent = LAST_RACE[cat].source;
    panel.classList.remove('is-in');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-in')));
  };
  $('#lr-title').innerHTML = `${esc(LAST_RACE.title)} <em>en ${esc(LAST_RACE.place)}</em>`;
  $('#lr-eyebrow').textContent = `ÚLTIMA CARRERA · RONDA ${LAST_RACE.round}/${SEASON.totalRounds} · ${LAST_RACE.dateLabel}`;
  return show;
}

function renderRemaining() {
  const left = CALENDAR.filter((c) => c.r > SEASON.completedRounds);
  $('#rem-list').innerHTML = left
    .map(
      (c) => `<li class="rcard ${c.r === NEXT_RACE.round ? 'is-next' : ''}" data-cursor>
        <a href="calendario.html#ronda-${c.r}" data-title="Calendario">
          <span class="rcard__n display" aria-hidden="true">${pad(c.r)}</span>
          <span class="rcard__body">
            ${c.r === NEXT_RACE.round ? '<span class="pill pill--hot mono"><i class="dot"></i>PRÓXIMO</span>' : '<span class="pill mono">RONDA ' + pad(c.r) + '</span>'}
            <b class="display rcard__country">${esc(c.country)}</b>
            <span class="rcard__circuit">${esc(c.circuit)}</span>
            <span class="mono rcard__meta"><span>${fmtRange(c.start, c.end)}</span>${c.km ? `<span>${c.km} KM</span>` : ''}</span>
          </span>
          <span class="rcard__arrow" aria-hidden="true">↗</span>
        </a>
      </li>`
    )
    .join('');
}

function renderFigures() {
  $('#fig-list').innerHTML = FIGURES.map(
    (f) => `<li data-reveal>
      <span class="display fig__n" data-count="${f.n}">${f.n}</span>
      <b class="mono fig__l">${esc(f.label)}</b>
      <small class="mono">${esc(f.sub)}</small>
    </li>`
  ).join('');
}

function renderMarquee() {
  const unit = MARQUEE.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
  $('#marquee-track').innerHTML = `<div class="marquee__row">${unit}</div><div class="marquee__row" aria-hidden="true">${unit}</div>`;
}

/* =========================================================
   ANIMACIONES
   ========================================================= */

function initHero({ gsap, ScrollTrigger, delay = 0 }) {
  const reduce = prefersReducedMotion();
  const main = $('#trk-main');
  const glow = $('#trk-glow');
  const dots = $$('.trk-dot');
  const hasLen = main && typeof main.getTotalLength === 'function';
  const len = hasLen ? main.getTotalLength() : 3000;

  [main, glow].forEach((p) => {
    if (!p) return;
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = reduce ? '0' : String(len);
  });

  const phrases = $$('.phrase');

  if (reduce) {
    gsap.set(phrases, { autoAlpha: 0 });
    if (phrases[0]) gsap.set(phrases[0], { autoAlpha: 1 });
    return;
  }

  // Intro
  const tl = gsap.timeline({ delay });
  tl.to([main, glow], { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' }, 0)
    .from('.hero__title .t1', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.1)
    .from('.hero__title .t2', { yPercent: -40, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.2)
    .from('.hero__hud > *', { opacity: 0, y: 14, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.8)
    .from('.hero__cta > *', { opacity: 0, y: 24, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 1.1);

  // Luz recorriendo el trazado
  if (hasLen && typeof main.getPointAtLength === 'function' && dots.length) {
    const lag = [0, 0.012, 0.024];
    gsap.ticker.add(() => {
      const base = (performance.now() / 8500) % 1;
      dots.forEach((d, i) => {
        const p = main.getPointAtLength((((base - lag[i]) % 1) + 1) % 1 * len);
        d.setAttribute('cx', p.x.toFixed(1));
        d.setAttribute('cy', p.y.toFixed(1));
      });
    });
  }

  // Frases rotatorias
  if (phrases.length) {
    gsap.set(phrases, { autoAlpha: 0, yPercent: 45 });
    let i = 0;
    const show = () => {
      const el = phrases[i];
      gsap.timeline({ onComplete: () => { i = (i + 1) % phrases.length; show(); } })
        .to(el, { autoAlpha: 1, yPercent: 0, duration: 0.8, ease: 'expo.out' })
        .to(el, { autoAlpha: 0, yPercent: -45, duration: 0.55, ease: 'power2.in' }, '+=2.3');
    };
    gsap.delayedCall(delay + 1, show);
  }

  // Parallax al hacer scroll (scrub)
  const trig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__track', { scale: 1.55, opacity: 0.15, ease: 'none', scrollTrigger: trig });
  gsap.to('.hero__title .t1', { yPercent: -28, ease: 'none', scrollTrigger: trig });
  gsap.to('.hero__title .t2', { yPercent: 38, ease: 'none', scrollTrigger: trig });
  gsap.to('.hero__glow', { opacity: 0.2, scale: 1.3, ease: 'none', scrollTrigger: trig });
}

function initCountdown({ gsap }) {
  if (!NEXT_RACE.round) return;
  startCountdown({
    gsap,
    target: NEXT_RACE.raceUTC,
    cells: { d: $('#cd-d'), h: $('#cd-h'), m: $('#cd-m'), s: $('#cd-s') },
    status: $('#cd-status'),
  });
}

function initScenes({ gsap, ScrollTrigger }) {
  const root = $('#scenes');
  const scenes = $$('.scene', root);
  const bgs = $$('[data-bg]', root);
  const cur = $('#sc-cur');
  const bar = $('#sc-bar');
  const mm = gsap.matchMedia();

  const runCounters = (scene) => {
    $$('[data-count]', scene).forEach((el) => {
      el.textContent = '0';
      countUp(gsap, el, { duration: 1.3 });
    });
  };

  // Escritorio: sección fija con scrub
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('is-pinned');
    let active = -1;
    const set = (i) => {
      if (i === active) return;
      active = i;
      scenes.forEach((s, k) => s.classList.toggle('is-active', k === i));
      cur.textContent = pad(i + 1);
      runCounters(scenes[i]);
    };
    set(0);
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        set(Math.min(scenes.length - 1, Math.floor(p * scenes.length)));
        bgs.forEach((b, k) => {
          const d = Math.abs(p - (k + 0.5) / scenes.length) * scenes.length;
          b.style.opacity = String(Math.max(0, 1 - Math.max(0, d - 0.2) / 0.5));
        });
        bar.style.transform = `scaleX(${p})`;
      },
    });
    bgs.forEach((b, k) => { b.style.opacity = k === 0 ? '1' : '0'; });
    return () => {
      st.kill();
      root.classList.remove('is-pinned');
      scenes.forEach((s) => s.classList.remove('is-active'));
    };
  });

  // Móvil o movimiento reducido: escenas apiladas
  mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
    const reduce = prefersReducedMotion();
    bgs.forEach((b) => { b.style.opacity = '0'; });
    const created = [];
    scenes.forEach((s) => {
      if (reduce) { s.classList.add('is-in'); return; }
      created.push(
        ScrollTrigger.create({
          trigger: s,
          start: 'top 80%',
          once: true,
          onEnter: () => { s.classList.add('is-in'); runCounters(s); },
        })
      );
    });
    return () => { created.forEach((c) => c.kill()); scenes.forEach((s) => s.classList.remove('is-in')); };
  });
}

function initCards({ gsap, ScrollTrigger }) {
  if (!document.documentElement.classList.contains('js-anim')) return;
  const items = $$('.rcard');
  gsap.set(items, { opacity: 0, y: 40 });
  ScrollTrigger.create({
    trigger: '#rem-list',
    start: 'top 85%',
    once: true,
    onEnter: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out' }),
  });
}

/* =========================================================
   INIT
   ========================================================= */
export function initHome(ctx) {
  const { gsap, ScrollTrigger } = ctx;

  renderHeroText();
  renderCountdown();
  renderScenes();
  renderRemaining();
  renderFigures();
  renderMarquee();

  const showStandings = renderStandings();
  bindTabs($('#st-tabs'), (cat) => {
    const panel = $('#st-list');
    panel.classList.remove('is-in');
    showStandings(cat);
    if (!prefersReducedMotion()) gsap.from('#st-list .srow', { opacity: 0, x: -24, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
  });

  const stList = $('#st-list');
  ScrollTrigger.create({
    trigger: stList,
    start: 'top 85%',
    once: true,
    onEnter: () => { stList.dataset.seen = '1'; stList.classList.add('is-in'); },
  });

  const showLast = renderLastRace();
  bindTabs($('#lr-tabs'), (cat) => {
    showLast(cat);
    if (!prefersReducedMotion()) gsap.from('#lr-panel > *', { opacity: 0, y: 20, duration: 0.55, stagger: 0.05, ease: 'power3.out' });
  });

  initCountdown(ctx);
  initScenes(ctx);
  initCards(ctx);
  initCounters(gsap, ScrollTrigger);
  initHero(ctx);
}
