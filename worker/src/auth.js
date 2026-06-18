/**
 * Basic Auth: заголовок Authorization: Basic base64(user:pass)
 * Секреты хранятся в env (wrangler secret put ADMIN_PASSWORD)
 */
export function isAuthorized(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Basic ')) return false;

  const decoded   = atob(authHeader.slice(6));   // "user:pass"
  const colonIdx  = decoded.indexOf(':');
  if (colonIdx === -1) return false;
  
  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  return user === (env.ADMIN_USER || 'admin')
      && pass === env.ADMIN_PASSWORD;              // из wrangler secret
}

export function unauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Linden Admin"' }
  });
}