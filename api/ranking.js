// api/ranking.js
// Proxy de GET: pega o ranking do Apps Script (sem CORS no navegador).

export default async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const URL_RANKING = process.env.URL_RANKING || '';

    if (!URL_RANKING) {
      return res.status(500).json({ error: 'URL_RANKING não configurada' });
    }

    const fwd = await fetch(URL_RANKING);
    const text = await fwd.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(fwd.ok ? 200 : fwd.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: String(err) });
  }
}
