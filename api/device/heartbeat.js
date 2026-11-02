import { updateHeartbeat } from '../_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const result = updateHeartbeat(body?.device_id, body?.wifi_rssi);

  return res.status(200).json({
    status: "success",
    message: "Heartbeat recorded successfully.",
    ...result
  });
}
