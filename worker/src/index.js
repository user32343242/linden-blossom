import { handleOrders }  from './orders.js';
import { handleBouquets } from './bouquets.js';
import { handleAdmin }   from './admin.js';

/**
 * Точка входа Cloudflare Worker
 * env — привязки: env.DB, env.ORDERS_META, env.BOUQUETS_STORE
 */
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // ── Preflight CORS ──────────────────────────────
    if (method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), env);
    }

    // ── Роутинг ─────────────────────────────────────
    if (path.startsWith('/api/orders'))  return corsResponse(await handleOrders(request, env), env);
    if (path.startsWith('/api/bouquets')) return corsResponse(await handleBouquets(request, env), env);
    if (path.startsWith('/admin'))        return corsResponse(await handleAdmin(request, env), env);

    return corsResponse(new Response('Not found', { status: 404 }), env);
  }
};

function corsResponse(response, env) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin',  env.CORS_ORIGIN || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, { status: response.status, headers });
}