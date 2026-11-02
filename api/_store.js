// Live Cloudflare Backend Bridge with local fallback for Vercel Serverless Functions

const BACKEND_URL = (process.env.BACKEND_URL || "https://vegetarian-star-lips-edited.trycloudflare.com").replace(/\/$/, '');

export async function proxyToBackend(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000)
    };
    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error(`Proxy to ${BACKEND_URL}${endpoint} failed:`, err.message);
  }
  return null;
}
