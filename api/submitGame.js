/**
 * Arquivo de proxy para o Vercel.
 * Este endpoint recebe requisições POST e as encaminha para a Cloud Function
 * da Google Cloud para processar o resultado do jogo.
 *
 * @param {import('@vercel/node').VercelRequest} req A requisição Vercel.
 * @param {import('@vercel/node').VercelResponse} res A resposta Vercel.
 */
export default async function handler(req, res) {
  // A URL da sua Cloud Function
  const cloudFunctionUrl = "https://submitgame-miwxat7aga-uc.a.run.app";

  // Verifica se a requisição é do tipo POST
  if (req.method !== "POST") {
    // Se não for POST, retorna 405 Method Not Allowed
    return res.status(405).json({ status: "error", message: "Método não permitido." });
  }

  try {
    // Encaminha a requisição POST, incluindo o corpo (body) original.
    const cloudFunctionRes = await fetch(cloudFunctionUrl, {
      method: "POST",
      // Transfere o corpo da requisição original para a Cloud Function
      body: JSON.stringify(req.body),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Se a resposta da Cloud Function não for bem-sucedida,
    // lança um erro para ser capturado no bloco catch.
    if (!cloudFunctionRes.ok) {
      const errorText = await cloudFunctionRes.text();
      throw new Error(`Erro da Cloud Function: ${cloudFunctionRes.status} ${cloudFunctionRes.statusText} - ${errorText}`);
    }

    // A requisição foi bem-sucedida. Analisa a resposta como JSON.
    const data = await cloudFunctionRes.json();

    // Envia a resposta da Cloud Function de volta para o cliente (o seu frontend).
    res.status(200).json(data);

  } catch (error) {
    // Em caso de erro, retorna um status 500 para o cliente.
    console.error("Erro no proxy Vercel:", error);
    res.status(500).json({ status: "error", message: "Erro ao se comunicar com o servidor de resultados.", details: error.message });
  }
}
