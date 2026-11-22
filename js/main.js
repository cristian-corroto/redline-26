/* Punto de entrada común a todas las páginas */
import { renderNav, renderFooter, initMenu, initNavAutoHide } from './components.js';
import {
  initSmoothScroll, initScrollProgress, initCursor, initMagnetic, initReveals,
} from './effects.js';
import { initTransitions } from './transition.js';
import { $, prefersReducedMotion } from './utils.js';
import { loadSeason } from './live.js';

const root = document.documentElement;
const page = document.body.dataset.page || 'home';

// Cada página interna carga solo su módulo
const PAGE_MODULES = {
  calendario: () => import('./calendario.js'),
  resultados: () => import('./resultados.js'),
  clasificacion: () => import('./clasificacion.js'),
  circuitos: () => import('./circuitos.js'),
};

// Datos en vivo antes de pintar (con copia de seguridad si la API no responde)
await loadSeason();

renderNav(page);
renderFooter();
initScrollProgress();
initNavAutoHide();

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if (!gsap || !ScrollTrigger) {
  // Sin GSAP: contenido estático legible, sin animaciones
  root.classList.remove('js-anim');
  console.error('[REDLINE] GSAP no se ha cargado; se muestra la versión sin animaciones.');
} else {
  gsap.registerPlugin(ScrollTrigger);
  if (prefersReducedMotion()) root.classList.add('reduce');

  const lenis = initSmoothScroll(gsap, ScrollTrigger);
  initMenu({ gsap, lenis });
  initCursor(gsap);
  initMagnetic(gsap);

  let started = false;
  const start = async () => {
    if (started) return;
    started = true;

    if (page === 'home') {
      const { initHome } = await import('./home.js');
      initHome({ gsap, ScrollTrigger, lenis, delay: 0.15 });

      // Capa WebGL opcional (escritorio, sin movimiento reducido)
      try {
        const { canRunFX, initFX } = await import('./fx3d.js');
        const canvas = $('#fx');
        if (canvas && canRunFX()) {
          await initFX(canvas, { getVelocity: () => (lenis ? lenis.velocity : 0) });
          root.classList.add('fx-on');
        }
      } catch (err) {
        console.warn('[REDLINE] WebGL desactivado:', err.message);
      }
    } else if (PAGE_MODULES[page]) {
      const { initPage } = await PAGE_MODULES[page]();
      initPage({ gsap, ScrollTrigger, lenis });
    }

    initReveals(gsap, ScrollTrigger);
    ScrollTrigger.refresh();
    scrollToHash(lenis);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  };

  initTransitions({ gsap, onReady: () => start().catch((e) => console.error('[REDLINE]', e)) });
}

// El contenido se pinta con JS: el salto nativo al #ancla llega antes de que exista
function scrollToHash(lenis) {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (!target) return;
  const y = target.getBoundingClientRect().top + window.scrollY - 90;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}
