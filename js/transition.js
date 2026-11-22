/* Transición entre páginas: cortinilla diagonal con el título de la página siguiente.
   Se apoya en un velo estático (.veil) presente en cada HTML + una marca en sessionStorage
   para que la página nueva arranque tapada y lo destape (sin saltos en blanco). */
import { $, prefersReducedMotion } from './utils.js';

const COVER = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
const LEFT = 'polygon(0 0, 0 0, -25% 100%, 0 100%)';
const RIGHT = 'polygon(100% 0, 100% 0, 125% 100%, 100% 100%)';

const isInternalPage = (a) => {
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
  let url;
  try { url = new URL(a.href, location.href); } catch { return false; }
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname && url.hash) return false; // ancla en la misma página
  return /\.html?$|\/$/.test(url.pathname);
};

export function initTransitions({ gsap, onReady }) {
  const veil = $('.veil');
  const title = $('.veil__title');
  const root = document.documentElement;
  const reduce = prefersReducedMotion();
  let leaving = false;

  const clearFlag = () => {
    try { sessionStorage.removeItem('rl-in'); sessionStorage.removeItem('rl-title'); } catch {}
    root.classList.remove('is-entering');
  };

  // Entrada: si venimos de otra página, el velo ya está cubriendo → lo retiramos
  const enter = () => {
    leaving = false;
    if (veil && root.classList.contains('is-entering')) {
      if (reduce || !gsap) {
        clearFlag();
        if (veil) veil.style.clipPath = RIGHT;
        onReady && onReady();
        return;
      }
      gsap.set(veil, { clipPath: COVER });
      gsap.timeline({ onComplete: () => { clearFlag(); gsap.set(veil, { clipPath: LEFT }); } })
        .to(title, { yPercent: -30, opacity: 0, duration: 0.45, ease: 'power2.in', delay: 0.15 })
        .to(veil, { clipPath: RIGHT, duration: 0.85, ease: 'expo.inOut' }, '<0.1')
        .add(() => onReady && onReady(), '<0.35');
    } else {
      onReady && onReady();
    }
  };

  // Salida: interceptar enlaces internos
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isInternalPage(a) || leaving) return;
    if (reduce || !gsap || !veil) return; // navegación normal
    e.preventDefault();
    leaving = true;
    const label = a.dataset.title || a.textContent.trim().replace(/\s+/g, ' ').slice(0, 24);
    title.textContent = label;
    try { sessionStorage.setItem('rl-in', '1'); sessionStorage.setItem('rl-title', label); } catch {}
    gsap.set(veil, { clipPath: LEFT });
    gsap.set(title, { yPercent: 30, opacity: 0 });
    gsap.timeline({ onComplete: () => { window.location.href = a.href; } })
      .to(veil, { clipPath: COVER, duration: 0.7, ease: 'expo.inOut' })
      .to(title, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '<0.25');
  });

  // Volver con el botón "atrás" (bfcache): reabrir la página sin velo
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      leaving = false;
      clearFlag();
      if (veil && gsap) gsap.set(veil, { clipPath: LEFT });
    }
  });

  enter();
}
