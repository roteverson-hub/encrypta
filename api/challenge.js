/**
 * @file challenge.js
 * @description Rota de API para buscar dados de desafio, utilizando uma variável de ambiente para a URL.
 */

// Importa o módulo 'process' para acessar variáveis de ambiente.
// No Vercel, `process.env` já é acessível.
import process from 'process';

// api/challenge.js
export default async function handler(req, res) {
  // Puxa a URL do Google Apps Script da variável de ambiente.
  const URL_CHALLENGE = process.env.URL_CHALLENGE;

  // Verifica se a variável de ambiente está definida para evitar erros.
  if (!URL_CHALLENGE) {
    console.error("Erro: A variável de ambiente URL_CHALLENGE não está definida. Certifique-se de que ela está configurada no Vercel.");
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).send(JSON.stringify({ error: "Erro de configuração: URL do desafio não encontrada." }));
    return;
  }
  
  try {
    const response = await fetch(URL_CHALLENGE);
    const data = await response.json();

    // Força Content-Type com UTF-8
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify(data));
  } catch (err) {
    console.error("Erro ao buscar desafio do Apps Script:", err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).send(JSON.stringify({ error: "Erro ao buscar desafio do Apps Script" }));
  }
}
