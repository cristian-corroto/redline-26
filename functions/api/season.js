/* GET /api/season · datos de la temporada en vivo.
   Los publica cada 30 minutos .github/workflows/season.yml (scripts/publish-season.mjs),
   que lee la API oficial de MotoGP. La web solo los sirve: responde al instante y no depende
   de que la API esté disponible en ese momento. Si aún no hay datos, la web usa js/snapshot.js. */
const JSON_TYPE = 'application/json; charset=utf-8';

export async function onRequestGet({ env }) {
  const body = await env.SEASON.get('season');
  if (!body) {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': JSON_TYPE, 'cache-control': 'no-store' },
    });
  }
  return new Response(body, {
    headers: { 'content-type': JSON_TYPE, 'cache-control': 'public, max-age=60' },
  });
}
