// api/submit.js
// Proxy de POST: recebe do front e encaminha ao Apps Script (sem CORS no navegador).

export default async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { username, challengeDate, elapsed, isCorrect } = body;

    const URL_RANKING = process.env.URL_RANKING || '';

    if (!URL_RANKING) {
      return res.status(500).json({ error: 'URL_RANKING não configurada' });
    }

    // Envia success = true somente se o usuário acertou todas as palavras
    const forward = await fetch(URL_RANKING, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        challengeDate,
        elapsed,
        success: !!isCorrect
      }),
    });

    const text = await forward.text();
    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text }; 
    }

    res.status(forward.ok ? 200 : forward.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: String(err) });
  }
}
