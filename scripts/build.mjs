/* Prepara dist/ con los archivos públicos de la web (sin scripts, README ni código de servidor).
   Uso: node scripts/build.mjs */
import { cp, rm, mkdir, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const PUBLIC = ['css', 'js', 'assets', '_headers', 'robots.txt', 'sitemap.xml'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist);
const html = (await readdir(root)).filter((f) => f.endsWith('.html'));
for (const f of [...html, ...PUBLIC]) await cp(new URL(f, root), new URL(f, dist), { recursive: true });
console.log(`dist/: ${html.length} páginas + ${PUBLIC.join(', ')}`);
