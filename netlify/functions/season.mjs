/* GET /api/season · datos de la temporada en vivo desde la API oficial de MotoGP.
   La respuesta se guarda en la caché de Netlify (CDN) unos minutos: la API de origen
   solo se consulta una vez por ventana, sea cual sea el número de visitas. */
import { buildSeason } from '../lib/motogp.mjs';

export default async () => {
  try {
    const data = await buildSeason();
    return new Response(JSON.stringify(data), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // navegador: 1 min · CDN: 10 min y, si caduca, sirve la copia anterior mientras se renueva
        'cache-control': 'public, max-age=60',
        'netlify-cdn-cache-control': 'public, durable, s-maxage=600, stale-while-revalidate=86400, stale-if-error=604800',
      },
    });
  } catch (err) {
    console.error('[season]', err);
    return new Response(JSON.stringify({ error: 'upstream', message: String(err.message || err) }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
};

export const config = { path: '/api/season' };
