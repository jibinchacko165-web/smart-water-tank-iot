import { proxyToBackend } from '../_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const liveHistory = await proxyToBackend(`/api/readings/history/${query}`);
  if (liveHistory) {
    return res.status(200).json(liveHistory);
  }

  return res.status(200).json({
    count: 0,
    statistics: {},
    readings: []
  });
}
