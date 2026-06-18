import { isAuthorized, unauthorizedResponse } from './auth.js';

export async function handleAdmin(request, env) {
  const url    = new URL(request.url);
  const path   = url.pathname;
  const method = request.method;

  // Allow unauthenticated access to the login form
  if (path === '/admin' || path === '/admin/') {
    return new Response(getAdminHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // Require auth for API endpoints
  if (!isAuthorized(request, env)) {
    return unauthorizedResponse();
  }

  // GET orders list
  if (path === '/admin/orders' && method === 'GET') {
    try {
      const result = await env.DB
        .prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 100`)
        .all();
      return json(result.results || []);
    } catch (e) {
      console.error('DB error:', e);
      return json({ error: 'Database error: ' + e.message }, 500);
    }
  }

  // UPDATE order status
  const patchMatch = path.match(/^\/admin\/orders\/(\d+)$/);
  if (patchMatch && method === 'PATCH') {
    const id   = patchMatch[1];
    const body = await request.json();
    const ALLOWED_STATUSES = ['new', 'confirmed', 'done', 'cancelled'];
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return json({ error: 'Invalid status' }, 422);
    }
    try {
      await env.DB
        .prepare(`UPDATE orders SET status = ? WHERE id = ?`)
        .bind(body.status, id).run();
      return json({ ok: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // DELETE order
  const delMatch = path.match(/^\/admin\/orders\/(\d+)$/);
  if (delMatch && method === 'DELETE') {
    const id = delMatch[1];
    try {
      await env.DB
        .prepare(`DELETE FROM orders WHERE id = ?`)
        .bind(id).run();
      return json({ ok: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // GET bouquets
  if (path === '/admin/bouquets' && method === 'GET') {
    try {
      const stored = await env.BOUQUETS_STORE.get('bouquets');
      return json(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // UPDATE bouquets
  if (path === '/admin/bouquets' && method === 'PUT') {
    try {
      const body = await request.json();
      await env.BOUQUETS_STORE.put('bouquets', JSON.stringify(body));
      return json({ ok: true, count: body.length });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getAdminHTML() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Linden Blossom - Admin</title>
  <style>
    :root {
      --bg-light: #ffffff;
      --bg-dark: #1a1a1a;
      --fg-light: #333333;
      --fg-dark: #eeeeee;
      --border-light: #e0e0e0;
      --border-dark: #333333;
      --accent: #7c6b5d;
      --success: #4caf50;
      --danger: #f44336;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-light);
      color: var(--fg-light);
      transition: all 0.3s ease;
    }
    body.dark {
      background: var(--bg-dark);
      color: var(--fg-dark);
    }
    html, body {
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-box {
      background: var(--bg-light);
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 100%;
      border: 1px solid var(--border-light);
    }
    body.dark .login-box {
      background: var(--bg-dark);
      border-color: var(--border-dark);
    }
    .login-box h1 {
      margin-bottom: 30px;
      text-align: center;
      color: var(--accent);
    }
    .login-box input {
      width: 100%;
      padding: 12px 16px;
      margin: 12px 0;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: var(--bg-light);
      color: var(--fg-light);
      font-size: 16px;
    }
    body.dark .login-box input {
      background: var(--bg-dark);
      border-color: var(--border-dark);
      color: var(--fg-dark);
    }
    .login-box button {
      width: 100%;
      padding: 12px;
      margin: 20px 0 0 0;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border-light);
    }
    body.dark .header {
      border-color: var(--border-dark);
    }
    .header h1 {
      color: var(--accent);
    }
    .header-right {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    .theme-toggle {
      padding: 8px 16px;
      background: var(--border-light);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    body.dark .theme-toggle {
      background: var(--border-dark);
    }
    .logout-btn {
      background: var(--danger) !important;
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 25px;
      border-bottom: 2px solid var(--border-light);
    }
    body.dark .tabs {
      border-color: var(--border-dark);
    }
    .tab {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      color: var(--fg-light);
      font-weight: 600;
      transition: all 0.2s;
    }
    body.dark .tab {
      color: var(--fg-dark);
    }
    .tab.active {
      border-bottom-color: var(--accent);
      color: var(--accent);
    }
    .section {
      background: var(--bg-light);
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 20px;
      display: none;
    }
    body.dark .section {
      background: var(--bg-dark);
      border-color: var(--border-dark);
    }
    .section.active {
      display: block;
    }
    .section h2 {
      margin-bottom: 20px;
      color: var(--accent);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: var(--border-light);
    }
    body.dark thead {
      background: var(--border-dark);
    }
    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: var(--accent);
    }
    td {
      padding: 15px;
      border-bottom: 1px solid var(--border-light);
    }
    body.dark td {
      border-color: var(--border-dark);
    }
    tr:hover {
      background: var(--border-light);
    }
    body.dark tr:hover {
      background: var(--border-dark);
    }
    button.btn-small {
      padding: 6px 12px;
      font-size: 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-delete {
      background: var(--danger);
      color: white;
    }
    .btn-primary {
      background: var(--accent);
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin: 10px 5px 10px 0;
    }
    textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      background: var(--bg-light);
      color: var(--fg-light);
      font-family: monospace;
      font-size: 13px;
      resize: vertical;
      margin: 15px 0;
    }
    body.dark textarea {
      background: var(--bg-dark);
      border-color: var(--border-dark);
      color: var(--fg-dark);
    }
    .error {
      color: var(--danger);
      margin: 10px 0;
      padding: 10px 15px;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 6px;
      border-left: 3px solid var(--danger);
    }
    .success {
      color: var(--success);
      margin: 10px 0;
      padding: 10px 15px;
      background: rgba(76, 175, 80, 0.1);
      border-radius: 6px;
      border-left: 3px solid var(--success);
    }
    .hidden {
      display: none !important;
    }
    select {
      padding: 8px;
      border: 1px solid var(--border-light);
      border-radius: 6px;
      background: var(--bg-light);
      color: var(--fg-light);
    }
    body.dark select {
      background: var(--bg-dark);
      border-color: var(--border-dark);
      color: var(--fg-dark);
    }
    @media (max-width: 768px) {
      .header { flex-direction: column; gap: 15px; }
      .tabs { flex-wrap: wrap; }
      table { font-size: 12px; }
      th, td { padding: 10px; }
    }
  </style>
</head>
<body>
  <div id="loginWrapper" class="login-wrapper">
    <div class="login-box">
      <h1>🌸 Linden Admin</h1>
      <input type="text" id="user" placeholder="admin" value="admin">
      <input type="password" id="pass" placeholder="Password" autocomplete="current-password">
      <button onclick="login()">Login</button>
      <div id="loginError" class="error hidden"></div>
    </div>
  </div>

  <div id="panel" class="hidden">
    <div class="container">
      <div class="header">
        <h1>🌸 Linden Blossom Admin</h1>
        <div class="header-right">
          <button class="theme-toggle" onclick="toggleTheme()">🌙 Theme</button>
          <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="switchTab('orders')">📦 Orders</button>
        <button class="tab" onclick="switchTab('bouquets')">🌹 Bouquets</button>
      </div>

      <section id="orders" class="section active">
        <h2>Orders Management</h2>
        <button class="btn-primary" onclick="refreshOrders()">🔄 Refresh</button>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Order #</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Bouquet</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="ordersTbody"></tbody>
          </table>
        </div>
        <div id="ordersError" class="error hidden"></div>
      </section>

      <section id="bouquets" class="section">
        <h2>Bouquets Management</h2>
        <button class="btn-primary" onclick="refreshBouquets()">🔄 Refresh</button>
        <button class="btn-primary" onclick="formatBouquets()">✨ Format</button>
        <button class="btn-primary" onclick="saveBouquets()">💾 Save</button>
        <textarea id="bouquetsEditor" rows="20"></textarea>
        <div id="bouquetsError" class="error hidden"></div>
        <div id="bouquetsSuccess" class="success hidden"></div>
      </section>
    </div>
  </div>

  <script>
    let auth = '';
    let theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') document.body.classList.add('dark');

    function toggleTheme() {
      theme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', theme);
      document.body.classList.toggle('dark');
    }

    function login() {
      const u = document.getElementById('user').value;
      const p = document.getElementById('pass').value;
      if (!u || !p) {
        showLoginError('Username and password required');
        return;
      }
      auth = 'Basic ' + btoa(u + ':' + p);
      localStorage.setItem('admin_user', u);
      localStorage.setItem('admin_pass', p);
      document.getElementById('loginWrapper').classList.add('hidden');
      document.getElementById('panel').classList.remove('hidden');
      refreshOrders();
    }

    function logout() {
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_pass');
      auth = '';
      document.getElementById('loginWrapper').classList.remove('hidden');
      document.getElementById('panel').classList.add('hidden');
    }

    function showLoginError(msg) {
      const err = document.getElementById('loginError');
      err.textContent = msg;
      err.classList.remove('hidden');
    }

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tab).classList.add('active');
      if (tab === 'bouquets') refreshBouquets();
    }

    async function refreshOrders() {
      try {
        const r = await fetch('/admin/orders', { headers: { Authorization: auth } });
        if (!r.ok) throw new Error('Auth failed: ' + r.status);
        const d = await r.json();
        renderOrders(d);
      } catch (e) {
        showError('ordersError', e.message);
      }
    }

    function renderOrders(orders) {
      const tbody = document.getElementById('ordersTbody');
      tbody.innerHTML = orders.map(o => \`<tr>
        <td>\${o.id}</td>
        <td>\${o.order_id || '?'}</td>
        <td>\${o.name}</td>
        <td>\${o.phone}</td>
        <td>\${o.bouquet || '-'}</td>
        <td>
          <select onchange="updateStatus(\${o.id},this.value)">
            <option value="">--</option>
            <option value="new" \${o.status === 'new' ? 'selected' : ''}>new</option>
            <option value="confirmed" \${o.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
            <option value="done" \${o.status === 'done' ? 'selected' : ''}>done</option>
            <option value="cancelled" \${o.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
          </select>
        </td>
        <td>\${o.created_at}</td>
        <td><button class="btn-small btn-delete" onclick="deleteOrder(\${o.id})">×</button></td>
      </tr>\`).join('');
    }

    async function updateStatus(id, status) {
      if (!status) return;
      try {
        const r = await fetch(\`/admin/orders/\${id}\`, {
          method: 'PATCH',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (!r.ok) throw new Error('Failed');
        refreshOrders();
      } catch (e) {
        showError('ordersError', e.message);
      }
    }

    async function deleteOrder(id) {
      if (!confirm('Delete order?')) return;
      try {
        const r = await fetch(\`/admin/orders/\${id}\`, { method: 'DELETE', headers: { Authorization: auth } });
        if (!r.ok) throw new Error('Failed');
        refreshOrders();
      } catch (e) {
        showError('ordersError', e.message);
      }
    }

    async function refreshBouquets() {
      try {
        const r = await fetch('/admin/bouquets', { headers: { Authorization: auth } });
        if (!r.ok) throw new Error('Auth failed: ' + r.status);
        const d = await r.json();
        document.getElementById('bouquetsEditor').value = JSON.stringify(d, null, 2);
      } catch (e) {
        showError('bouquetsError', e.message);
      }
    }

    function formatBouquets() {
      try {
        const e = document.getElementById('bouquetsEditor');
        e.value = JSON.stringify(JSON.parse(e.value), null, 2);
      } catch (e) {
        showError('bouquetsError', e.message);
      }
    }

    async function saveBouquets() {
      try {
        const data = JSON.parse(document.getElementById('bouquetsEditor').value);
        const r = await fetch('/admin/bouquets', {
          method: 'PUT',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error('Failed: ' + r.status);
        showSuccess('bouquetsSuccess', '✓ Saved ' + data.length + ' bouquets');
      } catch (e) {
        showError('bouquetsError', e.message);
      }
    }

    function showError(id, msg) {
      const el = document.getElementById(id);
      el.textContent = '❌ ' + msg;
      el.classList.remove('hidden');
    }

    function showSuccess(id, msg) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3000);
    }

    window.addEventListener('load', () => {
      const u = localStorage.getItem('admin_user');
      const p = localStorage.getItem('admin_pass');
      if (u && p) {
        document.getElementById('user').value = u;
        document.getElementById('pass').value = p;
        login();
      }
    });
  </script>
</body>
</html>`;
  return html;
}
