"""
============================================================
SENTIMENT AGENT — TRADEBOT-LAB Fase 0
============================================================

O QUE FAZ (a cada execução):
  1. Busca as notícias mais recentes de cripto no CryptoPanic
  2. Envia para o Claude (Haiku 4.5) via CLAUDE AGENT SDK,
     que usa o crédito mensal do teu plano MAX (não API paga!)
  3. Recebe um score de -1.0 a +1.0 por moeda
  4. Grava em user_data/sentiment.db — que a estratégia do
     Freqtrade lê antes de cada entrada

COMO RODAR:
  cd agents
  python sentiment_agent.py          # uma execução
  (o cron/systemd roda de hora em hora — ver README seção 6)

SEGURANÇA DE COBRANÇA:
  Este script ABORTA se ANTHROPIC_API_KEY estiver no ambiente,
  porque essa variável silenciosamente redireciona a cobrança
  para a API paga em vez da assinatura Max.
============================================================
"""

import asyncio
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

import requests

# ------------------------------------------------------------
# TRAVA DE SEGURANÇA DE COBRANÇA — não remova!
# ------------------------------------------------------------
if os.environ.get("ANTHROPIC_API_KEY"):
    sys.exit(
        "ERRO: ANTHROPIC_API_KEY está definida no ambiente.\n"
        "Ela teria prioridade sobre o token da tua assinatura Max e "
        "geraria cobrança na API paga.\n"
        "Rode:  unset ANTHROPIC_API_KEY   e tente de novo."
    )

from claude_agent_sdk import (  # noqa: E402  (import após a trava, de propósito)
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    query,
)

# ------------------------------------------------------------
# Configuração
# ------------------------------------------------------------
COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "LINK", "AVAX"]

# Token gratuito do CryptoPanic — ver README seção 4
CRYPTOPANIC_TOKEN = os.environ.get("CRYPTOPANIC_TOKEN", "")

# O banco fica dentro de user_data/ para o container do Freqtrade enxergar
DB_PATH = Path(__file__).resolve().parent.parent / "user_data" / "sentiment.db"

PROMPT_TEMPLATE = """Você é um analista de sentimento de mercado cripto. Analise os títulos de notícias abaixo e atribua UM score de sentimento por moeda.

Escala: -1.0 (extremamente negativo/bearish) a +1.0 (extremamente positivo/bullish). Use 0.0 para neutro ou quando não houver notícia relevante sobre a moeda.

Regras:
- Notícia ambígua ou clickbait = mais perto de 0.0
- Hack, processo regulatório, delisting = fortemente negativo
- Adoção institucional, ETF, upgrade de rede = positivo
- Considere apenas o que está nos títulos, não invente contexto

Moedas a pontuar: {coins}

Notícias:
{news}

Responda APENAS com JSON válido, sem markdown, sem explicação, neste formato exato:
{{"BTC": 0.2, "ETH": -0.1, ...}}"""


def fetch_news() -> list[str]:
    """Busca títulos recentes no CryptoPanic (free tier)."""
    if not CRYPTOPANIC_TOKEN:
        sys.exit(
            "ERRO: variável CRYPTOPANIC_TOKEN não definida.\n"
            "Crie o token gratuito (README seção 4) e rode:\n"
            "  export CRYPTOPANIC_TOKEN=seu_token"
        )
    url = (
        "https://cryptopanic.com/api/v1/posts/"
        f"?auth_token={CRYPTOPANIC_TOKEN}"
        f"&currencies={','.join(COINS)}"
        "&kind=news&public=true"
    )
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    posts = resp.json().get("results", [])
    titles = [p.get("title", "") for p in posts if p.get("title")]
    return titles[:40]  # 40 títulos bastam e mantêm o prompt barato


async def score_news(titles: list[str]) -> dict[str, float]:
    """Envia os títulos para o Claude e devolve {moeda: score}."""
    prompt = PROMPT_TEMPLATE.format(
        coins=", ".join(COINS),
        news="\n".join(f"- {t}" for t in titles),
    )

    raw = ""
    async for msg in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            model="claude-haiku-4-5",  # rápido e barato: classificação não precisa de Fable
            allowed_tools=[],          # sem ferramentas: só texto
            max_turns=1,
        ),
    ):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    raw += block.text

    # Extrai o JSON mesmo se vier com lixo em volta
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError(f"Resposta sem JSON: {raw[:200]}")
    scores = json.loads(match.group(0))

    # Sanitiza: só moedas conhecidas, valores entre -1 e 1
    clean = {}
    for coin in COINS:
        val = scores.get(coin, 0.0)
        try:
            clean[coin] = max(-1.0, min(1.0, float(val)))
        except (TypeError, ValueError):
            clean[coin] = 0.0
    return clean


def save_scores(scores: dict[str, float]) -> None:
    """Grava os scores no SQLite que a estratégia lê."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "CREATE TABLE IF NOT EXISTS sentiment ("
        "coin TEXT, score REAL, ts INTEGER)"
    )
    now = int(time.time())
    con.executemany(
        "INSERT INTO sentiment (coin, score, ts) VALUES (?, ?, ?)",
        [(coin, score, now) for coin, score in scores.items()],
    )
    con.commit()
    con.close()


def main() -> None:
    print("1/3 Buscando notícias no CryptoPanic...")
    titles = fetch_news()
    print(f"    {len(titles)} títulos coletados.")

    print("2/3 Pedindo scores ao Claude (Haiku, via assinatura Max)...")
    scores = asyncio.run(score_news(titles))
    for coin, score in sorted(scores.items()):
        bar = "+" * int(max(score, 0) * 10) or "-" * int(-min(score, 0) * 10)
        print(f"    {coin:<5} {score:+.2f}  {bar}")

    print("3/3 Gravando em", DB_PATH)
    save_scores(scores)
    print("OK.")


if __name__ == "__main__":
    main()
