/* Genera js/snapshot.js con los datos actuales de la API.
   Es la copia de seguridad que usa la web si /api/season no responde.
   Uso: node scripts/snapshot.mjs */
import { writeFile } from 'node:fs/promises';
import { buildSeason } from '../netlify/lib/motogp.mjs';

const t0 = Date.now();
const data = await buildSeason();
const out = `/* Copia de seguridad de los datos en vivo (generada con scripts/snapshot.mjs).
   Se usa solo si /api/season no responde y el navegador no guarda una copia más reciente. */
export default ${JSON.stringify(data, null, 1)};
`;
await writeFile(new URL('../js/snapshot.js', import.meta.url), out, 'utf8');
console.log(`snapshot: ronda ${data.completedRounds}/${data.totalRounds} · ${Date.now() - t0} ms`);
