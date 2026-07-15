# tradebot-lab — Fase 0

Sistema de trading em cripto: **Freqtrade** (motor de backtest e execução) + **agente de sentimento com Claude** (usando o crédito do teu plano Max, custo zero).

> ⚠️ Tudo roda em **dry-run** (dinheiro fictício). Nada aqui movimenta dinheiro real. Os gates para mudar isso estão no `plano-estrategico-trading-ia.md`.

---

## Como as peças se encaixam

```
CryptoPanic (notícias) ──> sentiment_agent.py ──> Claude Haiku (via plano Max)
                                                        │
                                              score por moeda (-1 a +1)
                                                        ▼
                                            user_data/sentiment.db
                                                        │
Binance (preços públicos) ──> Freqtrade ──> NewsMomentumStrategy lê o score
                                   │         e só compra se técnico + notícias
                                   │         concordarem
                                   ▼
                          Painel web em localhost:8080
```

---

## 1. Criar o repositório no GitHub (5 min)

No teu Ubuntu, dentro da pasta deste projeto:

```bash
cd ~/tradebot-lab          # ou onde tu descompactou
git init
git add .
git commit -m "Fase 0: Freqtrade dry-run + agente de sentimento"
```

Agora crie o repo remoto. Como tu já tens o GitHub CLI configurado na conta `juvenaltrajano-glitch`:

```bash
gh repo create tradebot-lab --private --source=. --push
```

**Sem `gh`?** Vá em github.com → botão **+** → **New repository** → nome `tradebot-lab` → **Private** → Create. Depois:

```bash
git remote add origin git@github.com:juvenaltrajano-glitch/tradebot-lab.git
git push -u origin main
```

> O `.gitignore` já impede que segredos (`.env`) e bancos de dados subam pro GitHub. Nunca remova essas linhas.

---

## 2. Subir o Freqtrade (10 min)

Pré-requisito: Docker (tu já tens). No terminal:

```bash
cd ~/tradebot-lab

# Antes de subir, edite user_data/config.json e troque:
#   - "jwt_secret_key": qualquer frase longa aleatória
#   - "password": tua senha do painel
nano user_data/config.json

docker compose up -d
docker compose logs -f freqtrade   # Ctrl+C para sair dos logs
```

Abra **http://localhost:8080** no navegador → login `juvenal` + a senha que tu definiu. Esse é o FreqUI, o painel do bot.

**O que tu vais ver:** o bot rodando em dry-run com carteira fictícia de 1.000 USDT, monitorando 8 pares. Ele provavelmente NÃO vai abrir trades ainda — porque a estratégia exige sentimento positivo, e o banco de sentimento ainda não existe. É o comportamento correto: **na dúvida, não opera**.

---

## 3. Baixar dados históricos para backtest (15 min)

```bash
docker compose run --rm freqtrade download-data \
  --config /freqtrade/user_data/config.json \
  --timeframe 1h 4h 1d \
  --timerange 20210101-
```

Isso baixa candles desde 2021 (inclui o crash de 2022 — essencial para testar a estratégia em mercado ruim). Demora alguns minutos.

**Rodar o primeiro backtest:**

```bash
docker compose run --rm freqtrade backtesting \
  --config /freqtrade/user_data/config.json \
  --strategy NewsMomentumStrategy \
  --timerange 20220101-20250101
```

No final aparece uma tabela. As colunas que importam:

| Métrica | O que significa | Gate da Fase 1 |
|---|---|---|
| **Total profit %** | Resultado no período | positivo |
| **Profit factor** | Ganhos ÷ perdas | **> 1,3** |
| **Max Drawdown** | Pior queda do topo | **< 20%** |
| **Total trades** | Amostra estatística | **> 100** |

> No backtest, o filtro de sentimento fica desligado (não existe sentimento histórico gratuito). O backtest valida o lado técnico; o dry-run valida o sistema completo.

---

## 4. Criar conta no CryptoPanic (5 min) — fonte de notícias

1. Acesse **cryptopanic.com** → **Sign up** (e-mail e senha, grátis)
2. Logado, vá em **cryptopanic.com/developers/api/** → copie o **API auth token**
3. No projeto:

```bash
cp .env.example .env
nano .env    # cole o token: CRYPTOPANIC_TOKEN=abc123...
```

O `.env` fica só na tua máquina (o `.gitignore` cuida disso).

---

## 5. Conectar o Claude ao teu plano Max (10 min)

Aqui está o pulo do gato: os agentes usam o **crédito mensal do Agent SDK** incluído no teu plano Max — não a API paga.

```bash
# 5.1 — Garantir que a variável perigosa NÃO existe
#       (se existir, a cobrança iria pra API paga silenciosamente)
echo $ANTHROPIC_API_KEY        # tem que sair vazio
unset ANTHROPIC_API_KEY        # se não saiu vazio
# e remova de ~/.bashrc / ~/.zshrc se estiver lá:
grep -n ANTHROPIC_API_KEY ~/.bashrc ~/.zshrc 2>/dev/null

# 5.2 — Gerar o token da assinatura (abre o navegador, tu autoriza)
claude setup-token

# 5.3 — Instalar as dependências do agente
cd ~/tradebot-lab
pip install -r agents/requirements.txt --break-system-packages
```

> O `sentiment_agent.py` tem uma trava: ele se recusa a rodar se `ANTHROPIC_API_KEY` estiver definida. Já houve caso de assinante Max tomar US$ 1.800 de fatura em 2 dias por causa dessa variável. A trava existe por isso.

**Testar:**

```bash
cd ~/tradebot-lab
set -a; source .env; set +a
python3 agents/sentiment_agent.py
```

Saída esperada:

```
1/3 Buscando notícias no CryptoPanic...
    38 títulos coletados.
2/3 Pedindo scores ao Claude (Haiku, via assinatura Max)...
    ADA   +0.10  +
    BTC   +0.40  ++++
    ETH   -0.20  --
    ...
3/3 Gravando em .../user_data/sentiment.db
OK.
```

A partir daí, o Freqtrade passa a enxergar os scores e a estratégia fica "armada" nos pares com sentimento ≥ +0,3.

---

## 6. Automatizar: rodar o agente de hora em hora (5 min)

```bash
crontab -e
```

Adicione esta linha no final (ajuste o caminho se necessário):

```
0 * * * * /home/SEU_USUARIO/tradebot-lab/scripts/run_sentiment.sh
```

Pronto: a cada hora cheia, notícias novas → scores novos → estratégia atualizada. Logs em `user_data/logs/sentiment.log`.

**Custo estimado no teu crédito Max:** ~24 chamadas Haiku/dia com prompts curtos ≈ poucos dólares/mês, contra US$ 100–200 de crédito mensal. Sobra folga enorme.

---

## 7. (Opcional, recomendado) Bot do Telegram — controle pelo celular

1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome → ele devolve um **token**
2. Fale com **@userinfobot** → ele mostra teu **chat id** (um número)
3. Em `user_data/config.json`, na seção `telegram`: `"enabled": true`, cole `token` e `chat_id`
4. `docker compose restart freqtrade`

Agora o bot te avisa de cada trade (fictício) e aceita comandos como `/status`, `/profit` e `/stopentry` direto do celular.

---

## 8. Rotina da Fase 0→1 (próximas semanas)

1. **Semana 1:** deixar tudo rodando. Conferir 1x/dia o painel e o `sentiment.log`. Nada de mexer em parâmetro.
2. **Semana 2:** rodar backtests variando `timerange` (2021, 2022, 2023, 2024) e anotar profit factor e drawdown de cada período. Se só ganhar em mercado de alta, a estratégia é fraca.
3. **Com os números na mão:** me trazer os resultados no Claude/Claude Code. Aí desenhamos as variantes (reversão à média, filtros diferentes) e rodamos o hyperopt — sempre com validação out-of-sample para não "decorar o passado".

## O que este projeto NÃO faz (de propósito)

- Não opera dinheiro real (`dry_run: true` travado até os gates do plano)
- Não pede API key da Binance (dry-run usa dados públicos)
- Não deixa o LLM inventar backtest nem decidir execução — Claude só pontua notícias; quem executa é código determinístico com stop fixo

---

## 9. Variantes agressivas (matriz da seção 9.3 do plano)

Backtest da variante long/short com conviction sizing (V2/V3):

```bash
docker compose run --rm freqtrade download-data \
  --config /freqtrade/user_data/config.futures.json \
  --timeframe 1h --timerange 20210101- --trading-mode futures

docker compose run --rm freqtrade backtesting \
  --config /freqtrade/user_data/config.futures.json \
  --strategy AggressiveConvictionStrategy \
  --timerange 20220101-20250101
```

Compare com a V1 (base) e preencha a matriz: profit factor, drawdown, retorno/mês, nº de trades. Gates da manga agressiva: PF > 1,3 | DD < 35% | ≥ 4%/mês | out-of-sample positivo.
