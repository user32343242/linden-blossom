import { isAuthorized, unauthorizedResponse } from './auth.js';

export async function handleAdmin(request, env) {
  // Проверка аутентификации на каждый запрос к /admin/*
  if (!isAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  const url    = new URL(request.url);
  const path   = url.pathname;
  const method = request.method;

  // GET /admin — вернуть HTML панели
  if (path === '/admin' || path === '/admin/') {
    return new Response(ADMIN_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // GET /admin/orders — список всех заказов
  if (path === '/admin/orders' && method === 'GET') {
    const page  = parseInt(url.searchParams.get('page')) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const result = await env.DB
      .prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?`)
      .bind(limit, offset).all();
    return json(result.results);
  }

  // PATCH /admin/orders/:id — изменить статус
  const patchMatch = path.match(/^\/admin\/orders\/(\d+)$/);
  if (patchMatch && method === 'PATCH') {
    const id   = patchMatch[1];
    const body = await request.json();
    const ALLOWED_STATUSES = ['new', 'confirmed', 'done', 'cancelled'];
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return json({ error: 'Invalid status' }, 422);
    }
    await env.DB
      .prepare(`UPDATE orders SET status = ? WHERE id = ?`)
      .bind(body.status, id).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// HTML панели (см. §8 ниже) — встроен в Worker как шаблонная строка
const ADMIN_HTML = `
  <!-- содержимое admin/index.html -->
`;