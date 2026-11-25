/* Lee la API oficial de MotoGP y publica los datos de la temporada en Cloudflare KV,
   de donde los sirve /api/season. Lo ejecuta .github/workflows/season.yml.
   Necesita CF_API_TOKEN y CF_ACCOUNT_ID (secretos del repositorio). */
import { buildSeason } from '../lib/motogp.mjs';

const NAMESPACE = '9010aab03f50404e87ba77688cc5c954';
const { CF_API_TOKEN, CF_ACCOUNT_ID } = process.env;
if (!CF_API_TOKEN || !CF_ACCOUNT_ID) throw new Error('Faltan CF_API_TOKEN o CF_ACCOUNT_ID');

const data = await buildSeason();
if (!data?.calendar?.length || !data?.standings?.motogp?.riders?.length) throw new Error('Datos incompletos: no se publican');

const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE}/values/season`;
const res = await fetch(url, {
  method: 'PUT',
  headers: { authorization: `Bearer ${CF_API_TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify(data),
});
if (!res.ok) throw new Error(`Cloudflare KV: HTTP ${res.status} ${await res.text()}`);
console.log(`Publicado: ronda ${data.completedRounds}/${data.totalRounds} · ${data.generatedAt}`);
