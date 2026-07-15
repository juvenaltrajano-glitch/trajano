#!/bin/bash
# Roda o agente de sentimento carregando o .env do projeto.
# Usado manualmente e pelo cron (README seção 6).
cd "$(dirname "$0")/.." || exit 1
set -a; source .env 2>/dev/null; set +a
unset ANTHROPIC_API_KEY   # trava extra de cobrança
python3 agents/sentiment_agent.py >> user_data/logs/sentiment.log 2>&1
