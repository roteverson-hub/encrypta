// pages/api/login.js
// Encaminha login ao Apps Script USERS_URL (POST), seta cookie se sucesso.
// GET retorna se há cookie "user" e verifica se já jogou hoje.
// DELETE apaga o cookie.

export default async function handler(req, res) {
  // Helpers
  const safeJson = async (r) => {
    try {
      return await r.json();
    } catch {
      const t = await r.text();
      try { return JSON.parse(t); } catch { return { raw: t }; }
    }
  };

  // Checa dailyTop do ranking para saber se `username` já jogou hoje
  async function checkRankingForUser(username) {
    try {
      const RANKING_URL = process.env.URL_RANKING || process.env.RANKING_URL || '';
      if (!RANKING_URL) return false;

      const r = await fetch(RANKING_URL);
      const data = await safeJson(r);
      const daily = data?.dailyTop || data?.daily || data?.daily_top || [];
      if (!Array.isArray(daily)) return false;

      const userLower = (username || '').toLowerCase();
      return daily.some(u => String(u.username || u?.user || '').toLowerCase() === userLower);
    } catch (err) {
      console.error("checkRankingForUser error:", err);
      return false;
    }
  }

  // POST -> login (forward to USERS_URL), adiciona cookie se sucesso
  if (req.method === "POST") {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Usuário e senha obrigatórios" });
      }

      const USERS_URL = process.env.USERS_URL || '';
      if (!USERS_URL) {
        return res.status(500).json({ success: false, message: "USERS_URL não configurada no servidor" });
      }

      // encaminha para Apps Script Users (login)
      const forward = await fetch(USERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });

      const data = await safeJson(forward);

      // calcula alreadyCompletedToday (prioriza resposta do Apps Script caso exista)
      let already = false;
      if (typeof data?.alreadyCompletedToday !== "undefined") {
        already = Boolean(data.alreadyCompletedToday);
      } else {
        already = await checkRankingForUser(username);
      }

      // se login ok, grava cookie simples para "memória do servidor"
      if (data && data.success) {
        const maxAge = 60 * 60 * 24; // 1 dia
        // define cookie (não HttpOnly porque queremos lê-lo no frontend via /api/login GET)
        res.setHeader("Set-Cookie", `user=${encodeURIComponent(username)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
      }

      return res.status(200).json({ ...data, alreadyCompletedToday: already });
    } catch (err) {
      console.error("Erro no /api/login POST:", err);
      return res.status(500).json({ success: false, message: "Erro interno no servidor" });
    }
  }

  // GET -> retorna se há usuário lembrado via cookie + verifica se jogou hoje
  if (req.method === "GET") {
    try {
      const cookie = req.headers.cookie || "";
      const match = cookie.match(/(?:^|;\s*)user=([^;]+)/);
      const username = match ? decodeURIComponent(match[1]) : null;

      let already = false;
      if (username) {
        already = await checkRankingForUser(username);
      }

      return res.status(200).json({
        success: true,
        logged: !!username,
        username: username || null,
        alreadyCompletedToday: already
      });
    } catch (err) {
      console.error("Erro no /api/login GET:", err);
      return res.status(500).json({ success: false, logged: false, username: null });
    }
  }

  // DELETE -> logout (limpa cookie)
  if (req.method === "DELETE") {
    try {
      // apaga cookie
      res.setHeader("Set-Cookie", `user=; Path=/; Max-Age=0; SameSite=Lax`);
      return res.status(200).json({ success: true, message: "Deslogado" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Erro ao deslogar" });
    }
  }

  return res.status(405).json({ success: false, message: "Método não permitido" });
}
