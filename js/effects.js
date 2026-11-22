/* Efectos globales: scroll suave, cursor, magnético, split text, reveals, progreso */
import { $, $$, prefersReducedMotion } from './utils.js';

/* ---------- Lenis + ScrollTrigger ---------- */
export function initSmoothScroll(gsap, ScrollTrigger) {
  if (prefersReducedMotion() || typeof window.Lenis !== 'function') return null;
  const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // anclas internas (#proximo, o pagina.html#proximo estando ya en esa página) con inercia
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    const id = decodeURIComponent(url.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) {
      e.preventDefault();
      syncLenis();
      lenis.scrollTo(target.getBoundingClientRect().top + window.scrollY - 70, { duration: 1.4 });
    }
  });

  // Tab/focus desplazan la página de forma nativa y Lenis no se entera: se resincroniza
  // para que su posición interna no se quede atrás (saltos a anclas mal calculados)
  const syncLenis = () => {
    if (!lenis.isScrolling && Math.abs(lenis.animatedScroll - window.scrollY) > 1) {
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    }
  };
  document.addEventListener('focusin', () => requestAnimationFrame(syncLenis));
  return lenis;
}

/* ---------- Barra de progreso de scroll ---------- */
export function initScrollProgress() {
  const bar = $('.progress i');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? window.scrollY / h : 0;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- Cursor personalizado + magnético ---------- */
export function initCursor(gsap) {
  const fine = matchMedia('(pointer: fine)').matches;
  const cur = $('.cursor');
  if (!fine || prefersReducedMotion() || !cur) {
    if (cur) cur.remove();
    return;
  }
  document.documentElement.classList.add('has-cursor');
  const dot = $('.cursor__dot', cur);
  const ring = $('.cursor__ring', cur);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      cur.classList.add('is-on');
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  document.addEventListener('pointerover', (e) => {
    cur.classList.toggle('is-hover', !!e.target.closest('a, button, [role="tab"], [data-cursor]'));
  });
}

export function initMagnetic(gsap) {
  if (!matchMedia('(pointer: fine)').matches || prefersReducedMotion()) return;
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------- Split text (palabras con máscara) ---------- */
export function splitWords(root) {
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = p;
          w.appendChild(wi);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    });
  };
  walk(root);
  return root.querySelectorAll('.wi');
}

/* ---------- Reveals al entrar en pantalla ---------- */
export function initReveals(gsap, ScrollTrigger) {
  const animate = document.documentElement.classList.contains('js-anim');

  $$('[data-split]').forEach((el) => {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    const words = splitWords(el);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    if (!animate) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      // el CSS oculta con translateY(112%), que GSAP lee como `y` en px: hay que anular ambos
      onEnter: () => gsap.to(words, { y: 0, yPercent: 0, duration: 1, stagger: 0.05, ease: 'expo.out' }),
    });
  });

  if (!animate) return;
  $$('[data-reveal]').forEach((el) => {
    gsap.set(el, { opacity: 0, y: 36 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: Number(el.dataset.delay || 0) }),
    });
  });
}

/* ---------- Contadores ---------- */
export function countUp(gsap, el, { duration = 1.4, delay = 0 } = {}) {
  const target = parseFloat(el.dataset.count);
  if (Number.isNaN(target)) return;
  const dec = Number(el.dataset.decimals || 0);
  const fmt = (v) => (dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)));
  if (prefersReducedMotion()) { el.textContent = fmt(target); return; }
  const o = { v: 0 };
  gsap.to(o, { v: target, duration, delay, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(target); } });
}

export function initCounters(gsap, ScrollTrigger, scope = document) {
  $$('[data-count]:not([data-count-manual])', scope).forEach((el) => {
    el.textContent = '0';
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => countUp(gsap, el) });
  });
}
