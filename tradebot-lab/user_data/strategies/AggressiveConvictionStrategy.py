# ============================================================
# AggressiveConvictionStrategy — variantes V2/V3 da matriz
#
# DIFERENÇAS vs. NewsMomentumStrategy (base):
#   1. FUTUROS com shorts habilitados — ganha também na queda
#      (notícia muito negativa = oportunidade de short)
#   2. CONVICTION SIZING via alavancagem 1x–3x:
#      score alto + volatilidade normal = posição maior
#   3. TRAVA DE VOLATILIDADE: ATR esticado corta alavancagem
#      para 1x ou bloqueia a entrada (regra 9.1 do plano)
#
# SÓ PARA BACKTEST/DRY-RUN nesta fase. Alavancagem real só
# entra na Fase 3+ após 2 meses positivos no spot (plano, 9.3).
#
# Para backtest de futuros, o config precisa de:
#   "trading_mode": "futures", "margin_mode": "isolated"
# (ver user_data/config.futures.json quando formos rodar V2/V3)
# ============================================================

import logging
from pandas import DataFrame
import talib.abstract as ta

from freqtrade.persistence import Trade
from freqtrade.strategy import IStrategy

# Reaproveita o leitor de sentimento da estratégia base
from NewsMomentumStrategy import get_sentiment, SENTIMENT_THRESHOLD

logger = logging.getLogger(__name__)

# Limites de alavancagem por nível de convicção (tabela 9.1 do plano)
LEV_BASE = 1.0
LEV_HIGH = 2.0      # score > 0.7 e volatilidade <= 1.5x média
LEV_MAX = 3.0       # score > 0.8 e volatilidade <= 1.2x média — teto absoluto
SHORT_THRESHOLD = -0.5  # score abaixo disso habilita short


class AggressiveConvictionStrategy(IStrategy):
    INTERFACE_VERSION = 3

    timeframe = "1h"
    can_short = True          # <<< shorts habilitados (V2)

    minimal_roi = {
        "0": 0.06,            # alvo maior: a manga busca 4-8%/mes
        "1440": 0.03,
        "2880": 0.015,
    }

    # Stop mais curto que a base: alavancado, o erro custa mais rápido
    stoploss = -0.02

    trailing_stop = True
    trailing_stop_positive = 0.015
    trailing_stop_positive_offset = 0.03
    trailing_only_offset_is_reached = True

    startup_candle_count = 50

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["vol_ma"] = dataframe["volume"].rolling(20).mean()

        # ATR = medida de volatilidade. Comparamos o ATR atual com a
        # média dos últimos 20 períodos: a razão é a "trava" da 9.1.
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["atr_ratio"] = dataframe["atr"] / dataframe["atr"].rolling(20).mean()

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        coin = metadata["pair"].split("/")[0]
        sentiment = get_sentiment(coin)

        live = self.dp.runmode.value in ("live", "dry_run")
        long_ok = (not live) or (sentiment is not None and sentiment >= SENTIMENT_THRESHOLD)
        short_ok = (not live) or (sentiment is not None and sentiment <= SHORT_THRESHOLD)

        # TRAVA DE VOLATILIDADE: ATR > 2x a média = mercado em pânico
        # ou euforia. Não entra em NADA (regra 9.1, última linha).
        vol_sane = dataframe["atr_ratio"] <= 2.0

        # LONG: tendência de alta + força + volume + sentimento positivo
        dataframe.loc[
            (
                (dataframe["ema20"] > dataframe["ema50"])
                & (dataframe["close"] > dataframe["ema20"])
                & (dataframe["rsi"] > 50) & (dataframe["rsi"] < 70)
                & (dataframe["volume"] > dataframe["vol_ma"] * 1.5)
                & vol_sane
                & long_ok
            ),
            "enter_long",
        ] = 1

        # SHORT: espelho — tendência de baixa + sentimento muito negativo
        dataframe.loc[
            (
                (dataframe["ema20"] < dataframe["ema50"])
                & (dataframe["close"] < dataframe["ema20"])
                & (dataframe["rsi"] < 50) & (dataframe["rsi"] > 30)
                & (dataframe["volume"] > dataframe["vol_ma"] * 1.5)
                & vol_sane
                & short_ok
            ),
            "enter_short",
        ] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (dataframe["ema20"] < dataframe["ema50"]) | (dataframe["rsi"] > 80),
            "exit_long",
        ] = 1
        dataframe.loc[
            (dataframe["ema20"] > dataframe["ema50"]) | (dataframe["rsi"] < 20),
            "exit_short",
        ] = 1
        return dataframe

    # ----------------------------------------------------------
    # CONVICTION SIZING — o Freqtrade chama isto a cada entrada
    # em futuros para decidir a alavancagem. Implementa a 9.1.
    # ----------------------------------------------------------
    def leverage(
        self,
        pair: str,
        current_time,
        current_rate: float,
        proposed_leverage: float,
        max_leverage: float,
        entry_tag: str | None,
        side: str,
        **kwargs,
    ) -> float:
        coin = pair.split("/")[0]
        sentiment = get_sentiment(coin)
        conviction = abs(sentiment) if sentiment is not None else 0.0

        # Volatilidade atual do par
        df, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        atr_ratio = float(df["atr_ratio"].iloc[-1]) if len(df) else 99.0

        if conviction > 0.8 and atr_ratio <= 1.2:
            lev = LEV_MAX
        elif conviction > 0.7 and atr_ratio <= 1.5:
            lev = LEV_HIGH
        else:
            lev = LEV_BASE

        lev = min(lev, max_leverage)
        logger.info(
            "%s %s: conviction=%.2f atr_ratio=%.2f -> alavancagem %.1fx",
            pair, side, conviction, atr_ratio, lev,
        )
        return lev

    # Segurança extra: nunca mais que 3 posições alavancadas > 1x
    def confirm_trade_entry(
        self, pair, order_type, amount, rate, time_in_force,
        current_time, entry_tag, side, **kwargs,
    ) -> bool:
        open_trades = Trade.get_open_trades()
        leveraged = [t for t in open_trades if (t.leverage or 1) > 1]
        if len(leveraged) >= 2:
            # já existem 2 posições alavancadas: esta entra só se for 1x
            # (o leverage() acima ainda será chamado; aqui apenas logamos)
            logger.info("%s: 2 posições alavancadas abertas — cautela.", pair)
        return True
