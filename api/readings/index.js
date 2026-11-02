import { proxyToBackend } from '../_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const liveRes = await proxyToBackend('/api/readings/', req.method, req.body);
  if (liveRes) {
    return res.status(req.method === 'POST' ? 201 : 200).json(liveRes);
  }

  return res.status(503).json({ error: "Backend service unreachable." });
}
