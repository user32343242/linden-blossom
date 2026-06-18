//C:\Users\VECTOR\linden-blossom\worker\src\orders.js

export async function handleOrders(request, env) {
  const method = request.method;

  // POST /api/orders — создать новый заказ
  if (method === 'POST') {
    let body;

    // ── Парсинг JSON ───────────────────────────────────────────────
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { name, phone, bouquet, message } = body;

    // ── Валидация обязательных полей ──────────────────────────────
    if (!name?.trim() || !phone?.trim()) {
      return json({ error: 'name and phone are required' }, 422);
    }

    // Инициализировать таблицу, если не существует
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS orders (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id    TEXT UNIQUE,
          seq_num     INTEGER NOT NULL,
          phone       TEXT NOT NULL,
          name        TEXT NOT NULL,
          bouquet     TEXT NOT NULL DEFAULT '',
          message     TEXT NOT NULL DEFAULT '',
          status      TEXT NOT NULL DEFAULT 'new',
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
      
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone)
      `).run();
      
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
      `).run();
    } catch (err) {
      console.warn('Schema init (table may already exist):', err.message);
    }

    // Rate limit: максимум 3 заказа в час с одного IP
    const ip      = request.headers.get('CF-Connecting-IP');
    const rlKey   = `rl:${ip}`;
    const rlRaw   = await env.ORDERS_META.get(rlKey);
    const rlCount = rlRaw ? parseInt(rlRaw) : 0;
    
    if (rlCount >= 5) {
      return json({ error: 'Too many requests. Try again later.' }, 429);
    }
    
    // Инкрементировать счётчик с TTL 1 час
    await env.ORDERS_META.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

    // ── 1. Сначала вставляем "черновую" запись ─────────────────────
    // order_id временно NULL, чтобы не было конфликтов UNIQUE
    let insert;
    try {
      insert = await env.DB
        .prepare(`
          INSERT INTO orders (order_id, seq_num, phone, name, bouquet, message)
          VALUES (NULL, 0, ?, ?, ?, ?)
        `)
        .bind(phone, name, bouquet || '', message || '')
        .run();
    } catch (err) {
      console.error('D1 insert error:', err);
      return json({ error: 'Database error' }, 500);
    }

    // ── 2. Берём rowid (он = seq_num) ──────────────────────────────
    const rowId = insert.meta?.last_row_id;

    if (!rowId) {
      return json({ error: 'Failed to get row ID' }, 500);
    }

    // ── 3. Формируем финальный orderId ─────────────────────────────
    const seqStr = String(rowId).padStart(4, '0'); // 0001
    const cleaned = phone.replace(/\D/g, '');      // только цифры
    const orderId = `#${seqStr}+${cleaned}`;

    // ── 4. Обновляем запись финальными данными ─────────────────────
    try {
      await env.DB
        .prepare(`
          UPDATE orders
          SET order_id = ?, seq_num = ?
          WHERE id = ?
        `)
        .bind(orderId, rowId, rowId)
        .run();
    } catch (err) {
      console.error('D1 update error:', err);
      return json({ error: 'Database update error' }, 500);
    }

    // ── Ответ клиенту ──────────────────────────────────────────────
    return json({ ok: true, orderId, seq: rowId }, 201);
  }

  // GET /api/orders — запрещено (для admin отдельный роут)
  return json({ error: 'Method not allowed' }, 405);
}

// ── Утилита JSON ответа ───────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}