// pages/api/register.js
// Recebe { username, password } e registra via Apps Script USERS_URL.
// Se sucesso, cria cookie para "memória" do servidor e retorna alreadyCompletedToday (se possível).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  // helper para parse seguro de json/text
  const safeJson = async (r) => {
    try { return await r.json(); } catch {
      const t = await r.text();
      try { return JSON.parse(t); } catch { return { raw: t }; }
    }
  };

  // Checa dailyTop do ranking para saber se `username` já jogou hoje
  async function checkRankingForUser(username) {
    try {
      const RANKING_URL = process.env.URL_RANKING || process.env.RANKING_URL || '';
      if (!RANKING_URL) return false;
      const rr = await fetch(RANKING_URL);
      const data = await safeJson(rr);
      const daily = data?.dailyTop || data?.daily || data?.daily_top || [];
      if (!Array.isArray(daily)) return false;
      const userLower = (username || '').toLowerCase();
      return daily.some(u => String(u.username || u?.user || '').toLowerCase() === userLower);
    } catch (err) {
      console.error("checkRankingForUser (register) error:", err);
      return false;
    }
  }

  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Usuário e senha obrigatórios" });
    }

    const USERS_URL = process.env.USERS_URL || '';
    if (!USERS_URL) {
      return res.status(500).json({ success: false, message: "USERS_URL não configurada no servidor" });
    }

    // encaminha para Apps Script Users (register)
    const forward = await fetch(USERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", username, password }),
    });

    const data = await safeJson(forward);

    // Se registro ocorreu com sucesso, definimos cookie e retornamos já como "logado"
    if (data && data.success) {
      try {
        const maxAge = 60 * 60 * 24; // 1 dia
        res.setHeader("Set-Cookie",
          `user=${encodeURIComponent(username)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
      } catch (err) {
        console.warn("Não foi possível setar cookie no registro:", err);
      }

      // Tentamos verificar no ranking se já completou (provavelmente false para novo usuário,
      // mas mantemos a verificação para consistência)
      const already = await checkRankingForUser(username);

      return res.status(200).json({ ...data, alreadyCompletedToday: already });
    }

    // registro falhou (por exemplo: usuário já existe) — apenas retorna o retorno do Apps Script
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erro no /api/register:", err);
    return res.status(500).json({ success: false, message: "Erro interno no servidor" });
  }
}
