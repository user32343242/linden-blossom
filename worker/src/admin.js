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

  if (path === '/admin/orders' && method === 'GET') {
    const result = await env.DB
      .prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 50`)
      .all();
    return json(result.results);
  }

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

function getAdminHTML() {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Linden Admin</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5}html,body{height:100%}.container{max-width:1200px;margin:0 auto;padding:20px}h1,h2{margin:20px 0 10px;color:#333}table{width:100%;border-collapse:collapse;background:#fff;margin:20px 0}th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}th{background:#f8f8f8;font-weight:600}tr:hover{background:#f9f9f9}textarea{width:100%;padding:10px;font-family:monospace;border:1px solid #ddd;resize:vertical}button{padding:10px 20px;margin:5px;background:#4CAF50;color:#fff;border:0;cursor:pointer;border-radius:4px}button:hover{background:#45a049}.logout{background:#f44336!important;float:right}select{padding:6px 10px;border:1px solid #ddd;border-radius:4px}#jsonError{color:red;margin:10px 0}.login{max-width:400px;margin:100px auto;padding:20px;background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1)}.login input{display:block;width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:4px}.login button{width:100%}section{background:#fff;padding:20px;margin:20px 0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)}.hidden{display:none}</style></head><body><div class="container"><div id="loginForm" class="login"><h1>Linden Admin</h1><input type="text" id="user" placeholder="admin" value="admin"><input type="password" id="pass" placeholder="Password"><button onclick="login()">Login</button></div><div id="panel" class="hidden"><h1>Linden Admin <button class="logout" onclick="logout()">Logout</button></h1><div style="clear:both"></div><section><h2>Orders</h2><table id="ordersTable"><thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Bouquet</th><th>Status</th><th>Date</th></tr></thead><tbody id="tbody"></tbody></table></section><section><h2>Bouquets JSON</h2><textarea id="editor" rows="30"></textarea><div id="error"></div><button onclick="save()">Save</button><button onclick="format()">Format</button></section></div></div><script>let c="";function login(){const u=document.getElementById("user").value,p=document.getElementById("pass").value;c=btoa(u+":"+p);localStorage.setItem("u",u);localStorage.setItem("p",p);show();load();bouq()}function logout(){localStorage.removeItem("u");localStorage.removeItem("p");document.getElementById("loginForm").classList.remove("hidden");document.getElementById("panel").classList.add("hidden")}function show(){document.getElementById("loginForm").classList.add("hidden");document.getElementById("panel").classList.remove("hidden")}async function load(){try{const r=await fetch("/admin/orders",{headers:{Authorization:"Basic "+c}}),d=await r.json();document.getElementById("tbody").innerHTML=d.map(o=>"<tr><td>"+o.order_id+"</td><td>"+o.name+"</td><td>"+o.phone+"</td><td>"+(o.bouquet||"-")+"</td><td><select onchange=upd("+o.id+",this.value)><option "+(o.status==="new"?"selected":"")+">new<option "+(o.status==="confirmed"?"selected":"")+">confirmed<option "+(o.status==="done"?"selected":"")+">done<option "+(o.status==="cancelled"?"selected":"")+">cancelled</select><td>"+o.created_at).join("")}catch(e){alert("Error: "+e.message)}}async function upd(i,s){try{await fetch("/admin/orders/"+i,{method:"PATCH",headers:{Authorization:"Basic "+c,"Content-Type":"application/json"},body:JSON.stringify({status:s})})}catch(e){alert("Error: "+e.message)}}async function bouq(){try{const r=await fetch("/api/bouquets",{headers:{Authorization:"Basic "+c}}),d=await r.json();document.getElementById("editor").value=JSON.stringify(d,null,2)}catch(e){alert("Error: "+e.message)}}function format(){try{const e=document.getElementById("editor");e.value=JSON.stringify(JSON.parse(e.value),null,2);document.getElementById("error").textContent=""}catch(e){document.getElementById("error").textContent="Error: "+e.message}}async function save(){try{const p=JSON.parse(document.getElementById("editor").value),r=await fetch("/api/bouquets",{method:"PUT",headers:{Authorization:"Basic "+c,"Content-Type":"application/json"},body:JSON.stringify(p)}),d=await r.json();alert(d.ok?"Saved "+d.count+" items":d.error)}catch(e){alert("Error: "+e.message)}}window.addEventListener("load",function(){const u=localStorage.getItem("u"),p=localStorage.getItem("p");if(u&&p){document.getElementById("user").value=u;document.getElementById("pass").value=p;login()}})</script></body></html>';
}
