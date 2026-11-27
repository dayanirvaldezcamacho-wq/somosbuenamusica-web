// Protección de /admin: solo entran los correos de la variable ADMIN_EMAILS
// (separados por comas), verificados con el token firmado de Cloudflare Access.
// Si faltan ACCESS_TEAM, ACCESS_AUD o ADMIN_EMAILS, /admin queda cerrado para todos.
const CANON = 'somosbuenamusica.com';

function b64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
let certCache = { at: 0, keys: null };
async function verifyAccess(jwt, team, aud) {
  if (!jwt || !team || !aud) return null;
  const [h, p, sig] = jwt.split('.');
  if (!sig) return null;
  const header = JSON.parse(new TextDecoder().decode(b64u(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (!certCache.keys || Date.now() - certCache.at > 3600e3) {
    const r = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
    certCache = { at: Date.now(), keys: (await r.json()).keys };
  }
  const jwk = certCache.keys.find(k => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  if (payload.exp < Date.now() / 1000) return null;
  if (payload.iss !== `https://${team}.cloudflareaccess.com`) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return null;
  return (payload.email || '').toLowerCase();
}

const denied = () => new Response(
  '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso restringido</title><body style="font-family:system-ui;background:#F6E3CD;color:#003B3A;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1>Acceso restringido</h1><p>Esta sección es solo para la administración del festival.</p><p><a href="https://somosbuenamusica.com/" style="color:#BC2313">Volver a la web</a></p></div></body></html>',
  { status: 403, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = CANON; url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    const allowed = (env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    let email = null;
    try { email = await verifyAccess(request.headers.get('Cf-Access-Jwt-Assertion'), env.ACCESS_TEAM, env.ACCESS_AUD); } catch (e) { email = null; }
    if (!email || !allowed.includes(email)) return denied();
  }
  return next();
}
