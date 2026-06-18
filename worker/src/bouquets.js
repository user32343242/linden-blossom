import { isAuthorized, unauthorizedResponse } from './auth.js';

const KV_KEY = 'bouquets_v1';

export async function handleBouquets(request, env) {
  const method = request.method;

  // GET /api/bouquets — публичный, отдаёт JSON для сайта
  if (method === 'GET') {
    const raw = await env.BOUQUETS_STORE.get(KV_KEY);
    if (!raw) {
      // Если KV пуст — вернуть дефолтные данные из исходного кода
      return json(DEFAULT_BOUQUETS());
    }
    return new Response(raw, { headers: { 'Content-Type': 'application/json' } });
  }

  // PUT /api/bouquets — сохранить (только admin)
  if (method === 'PUT') {
    if (!isAuthorized(request, env)) return unauthorizedResponse();

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    // Валидация структуры
    if (!Array.isArray(body)) return json({ error: 'Expected array' }, 422);
    const required = ['id', 'price', 'emoji', 'popularity'];
    for (const item of body) {
      for (const field of required) {
        if (item[field] === undefined) {
          return json({ error: `Missing field '${field}' in item ${item.id}` }, 422);
        }
      }
    }

    await env.BOUQUETS_STORE.put(KV_KEY, JSON.stringify(body));
    return json({ ok: true, count: body.length });
  }

  return json({ error: 'Method not allowed' }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

// Дефолтные данные (копия из my_site.html) — используются при первом запуске
function DEFAULT_BOUQUETS() {
  return [
    { id: 'LB-0042', price: 4500, emoji: '🌹', popularity: 95,
      size:      { ru: 'Средний (45 см)', en: 'Medium (45 cm)', zh: '中号 (45厘米)' },
      freshness: { ru: '7-10 дней',      en: '7-10 days',      zh: '7-10天' },
      wrap:      { ru: 'Крафт + лента',   en: 'Kraft + ribbon', zh: '牛皮纸 + 丝带' } },
    // ...остальные 7 букетов
  ];
}