import { getDeviceStatus } from '../_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const status = getDeviceStatus();
  return res.status(200).json(status);
}
