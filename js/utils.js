/* Utilidades compartidas */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pad = (n, len = 2) => String(n).padStart(len, '0');

/* 265.5 -> "265,5" · 355 -> "355" */
export const fmtPts = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/* '2026-10-23','2026-10-25' -> "23—25 OCT" · cruza de mes: "30 OCT — 1 NOV" */
export function fmtRange(start, end) {
  const [, m1, d1] = start.split('-').map(Number);
  const [, m2, d2] = end.split('-').map(Number);
  if (m1 === m2) return `${d1}—${d2} ${MONTHS[m1 - 1]}`;
  return `${d1} ${MONTHS[m1 - 1]} — ${d2} ${MONTHS[m2 - 1]}`;
}

/* Marcos de esquina (HUD) */
export const corners = () =>
  '<i class="c c--tl"></i><i class="c c--tr"></i><i class="c c--bl"></i><i class="c c--br"></i>';

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
