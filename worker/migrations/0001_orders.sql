-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT UNIQUE,                 -- финальный orderId
  seq_num     INTEGER NOT NULL,            -- порядковый номер (rowid)
  phone       TEXT NOT NULL,
  name        TEXT NOT NULL,
  bouquet     TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new', -- new | confirmed | done | cancelled
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Индексы для поиска
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);