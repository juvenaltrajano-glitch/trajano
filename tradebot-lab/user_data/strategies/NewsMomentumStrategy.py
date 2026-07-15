# ============================================================
# NewsMomentumStrategy — TRADEBOT-LAB Fase 0
#
# IDEIA EM UMA FRASE:
#   Só compra quando o sinal TÉCNICO (tendência + volume) e o
#   SENTIMENTO das notícias (calculado pelo agente Claude)
#   concordam. Qualquer um dos dois sozinho NÃO opera.
#
# COMO O SENTIMENTO CHEGA AQUI:
#   O script agents/sentiment_agent.py roda de hora em hora,
#   lê notícias do CryptoPanic, pede ao Claude (Haiku) um score
#   de -1.0 (muito negativo) a +1.0 (muito positivo) por moeda,
#   e grava em data/sentiment.db (SQLite).
#   Esta estratégia lê o score mais recente de cada par.
#
# GESTÃO DE RISCO (fixa em código — o LLM não toca aqui):
#   - stoploss de -3% por trade
#   - alvo escalonado via minimal_roi
#   - máx. 3 posições simultâneas (config.json)
# ============================================================

import logging
import sqlite3
import time
from pathlib import Path

from pandas import DataFrame
import talib.abstract as ta

from freqtrade.strategy import IStrategy

logger = logging.getLogger(__name__)

# Caminho do banco de sentimento DENTRO do container
# (./data no host é montado como /freqtrade/user_data/../data? não —
#  usamos user_data/, que já é volume compartilhado)
SENTIMENT_DB = Path("/freqtrade/user_data/sentiment.db")

# Score mínimo de sentimento para permitir compra
SENTIMENT_THRESHOLD = 0.3
# Idade máxima do score (segundos). Score velho = não confiar = não operar.
SENTIMENT_MAX_AGE = 6 * 3600  # 6 horas


def get_sentiment(coin: str) -> float | None:
    """Lê o score de sentimento mais recente da moeda no SQLite.

    Retorna None se não houver score ou se estiver velho demais.
    Em caso de QUALQUER erro, retorna None (ou seja: na dúvida, não opera).
    """
    try:
        if not SENTIMENT_DB.exists():
            return None
        con = sqlite3.connect(SENTIMENT_DB)
        cur = con.execute(
            "SELECT score, ts FROM sentiment WHERE coin = ? "
            "ORDER BY ts DESC LIMIT 1",
            (coin,),
        )
        row = cur.fetchone()
        con.close()
        if row is None:
            return None
        score, ts = row
        if time.time() - ts > SENTIMENT_MAX_AGE:
            return None  # score vencido
        return float(score)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Falha ao ler sentimento de %s: %s", coin, exc)
        return None


class NewsMomentumStrategy(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1h"
    can_short = False

    # Alvos de saída: fecha com +4% imediato, +2% após 24h, +1% após 48h
    minimal_roi = {
        "0": 0.04,
        "1440": 0.02,
        "2880": 0.01,
    }

    # Perda máxima por trade: -3% e acabou. Sem "esperar voltar".
    stoploss = -0.03

    # Trailing stop: depois de +2% de lucro, protege 1%
    trailing_stop = True
    trailing_stop_positive = 0.01
    trailing_stop_positive_offset = 0.02
    trailing_only_offset_is_reached = True

    startup_candle_count = 50

    # ----------------------------------------------------------
    # 1) INDICADORES — calculados para cada candle
    # ----------------------------------------------------------
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Médias móveis exponenciais: tendência de curto vs. médio prazo
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)

        # RSI: evita comprar topo esticado
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        # Volume médio: só entra com volume acima da média (confirmação)
        dataframe["vol_ma"] = dataframe["volume"].rolling(20).mean()

        return dataframe

    # ----------------------------------------------------------
    # 2) ENTRADA — todas as condições precisam ser verdadeiras
    # ----------------------------------------------------------
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        coin = metadata["pair"].split("/")[0]  # "BTC/USDT" -> "BTC"
        sentiment = get_sentiment(coin)

        # Filtro de sentimento: sem score válido e positivo, não opera.
        # (No BACKTEST o sentimento histórico não existe, então o filtro
        #  é ignorado ali — o backtest da Fase 1 testa o lado técnico;
        #  o dry-run da Fase 2 testa o sistema completo.)
        sentiment_ok = True
        if self.dp.runmode.value in ("live", "dry_run"):
            sentiment_ok = sentiment is not None and sentiment >= SENTIMENT_THRESHOLD
            if not sentiment_ok:
                logger.info(
                    "%s: sentimento %s bloqueou entradas", coin, sentiment
                )

        dataframe.loc[
            (
                (dataframe["ema20"] > dataframe["ema50"])          # tendência de alta
                & (dataframe["close"] > dataframe["ema20"])         # preço acima da média curta
                & (dataframe["rsi"] > 50) & (dataframe["rsi"] < 70) # força sem exagero
                & (dataframe["volume"] > dataframe["vol_ma"] * 1.5) # volume 50% acima da média
                & sentiment_ok                                       # notícias a favor
            ),
            "enter_long",
        ] = 1
        return dataframe

    # ----------------------------------------------------------
    # 3) SAÍDA — além do ROI/stoploss, sai se a tendência virar
    # ----------------------------------------------------------
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["ema20"] < dataframe["ema50"])  # tendência virou
                | (dataframe["rsi"] > 80)                   # sobrecomprado extremo
            ),
            "exit_long",
        ] = 1
        return dataframe
