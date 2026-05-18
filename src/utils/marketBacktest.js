/**
 * Parse plain OHLC CSV text into normalized candle objects.
 * Expected headers include: date, open, high, low, close, volume.
 */
export function parseOhlcCsv(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const rows = splitCsvRows(text.trim());
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(item => normalizeHeader(item));
  const dateIndex = findHeaderIndex(headers, ["date", "time", "datetime"]);
  const openIndex = findHeaderIndex(headers, ["open", "o"]);
  const highIndex = findHeaderIndex(headers, ["high", "h"]);
  const lowIndex = findHeaderIndex(headers, ["low", "l"]);
  const closeIndex = findHeaderIndex(headers, ["close", "c"]);
  const volumeIndex = findHeaderIndex(headers, ["volume", "vol", "v"]);

  if ([dateIndex, highIndex, lowIndex, closeIndex].some(index => index === -1)) {
    return [];
  }

  return rows
    .slice(1)
    .map(columns => {
      const candle = {
        date: String(columns[dateIndex] ?? "").trim(),
        open: toNumber(columns[openIndex]),
        high: toNumber(columns[highIndex]),
        low: toNumber(columns[lowIndex]),
        close: toNumber(columns[closeIndex]),
        volume: toNumber(columns[volumeIndex]),
      };

      if (!candle.date || !Number.isFinite(candle.high) || !Number.isFinite(candle.low) || !Number.isFinite(candle.close)) {
        return null;
      }

      if (!Number.isFinite(candle.open)) {
        candle.open = candle.close;
      }

      return candle;
    })
    .filter(Boolean);
}

/**
 * Group daily candles by calendar year for yearly review.
 */
export function getCandleYears(candles) {
  return Array.from(new Set((candles || []).map(item => item.date.slice(0, 4))))
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));
}

/**
 * Convert daily candles into weekly candles. Weeks are grouped by the Monday of
 * each market week, which is stable enough for visual trend analysis.
 */
export function aggregateWeeklyCandles(candles) {
  const groups = new Map();

  (candles || []).forEach(candle => {
    const weekKey = getWeekStart(candle.date);
    const current = groups.get(weekKey);

    if (!current) {
      groups.set(weekKey, {
        date: weekKey,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      return;
    }

    current.high = Math.max(current.high, candle.high);
    current.low = Math.min(current.low, candle.low);
    current.close = candle.close;
    current.volume += candle.volume || 0;
  });

  return Array.from(groups.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Add moving average values to candles for configurable chart overlays.
 */
export function attachMovingAverages(candles, periods) {
  const activePeriods = periods
    .map(period => Number(period))
    .filter(period => Number.isFinite(period) && period > 1);

  return (candles || []).map((candle, index) => {
    const ma = {};

    activePeriods.forEach(period => {
      if (index + 1 < period) return;

      const window = candles.slice(index - period + 1, index + 1);
      const sum = window.reduce((total, item) => total + item.close, 0);
      ma[period] = sum / period;
    });

    return { ...candle, ma };
  });
}

/**
 * Return a compact high/low summary for the currently selected chart window.
 */
export function getRangeExtremes(candles) {
  if (!candles?.length) {
    return null;
  }

  return candles.reduce((summary, candle) => {
    const high = !summary.high || candle.high > summary.high.price
      ? { price: candle.high, date: candle.date }
      : summary.high;
    const low = !summary.low || candle.low < summary.low.price
      ? { price: candle.low, date: candle.date }
      : summary.low;

    return { high, low };
  }, { high: null, low: null });
}

/**
 * Convert selected Gann trend values into market price levels.
 * `priceUnit` means the market price delta represented by one matrix step.
 */
export function buildBacktestLevels({
  clickedValue,
  trendMain,
  trendCross,
  matrixStep,
  anchorPrice,
  priceUnit,
}) {
  const safeMatrixStep = Number(matrixStep) || 1;
  const safePriceUnit = Number(priceUnit) || 0;
  const safeAnchorPrice = Number(anchorPrice);

  if (!Number.isFinite(clickedValue) || !Number.isFinite(safeAnchorPrice) || !safePriceUnit) {
    return [];
  }

  return [
    ...mapTrendPoints(trendMain, "main", clickedValue, safeMatrixStep, safeAnchorPrice, safePriceUnit),
    ...mapTrendPoints(trendCross, "cross", clickedValue, safeMatrixStep, safeAnchorPrice, safePriceUnit),
  ];
}

/**
 * Evaluate whether each candle touched any derived level and whether that touch
 * behaved more like support or resistance around the close.
 */
export function runBacktest(candles, levels, tolerance) {
  const safeTolerance = Math.max(0, Number(tolerance) || 0);
  const events = [];

  candles.forEach(candle => {
    levels.forEach(level => {
      const touched = candle.low <= level.price + safeTolerance && candle.high >= level.price - safeTolerance;
      if (!touched) return;

      const lowDistance = Math.abs(candle.low - level.price);
      const highDistance = Math.abs(candle.high - level.price);
      const closeDistance = Math.abs(candle.close - level.price);

      events.push({
        date: candle.date,
        levelPrice: roundPrice(level.price),
        matrixValue: level.matrixValue,
        lineType: level.lineType,
        kind: candle.close >= level.price ? "support" : "resistance",
        low: candle.low,
        high: candle.high,
        close: candle.close,
        distance: roundPrice(Math.min(lowDistance, highDistance, closeDistance)),
      });
    });
  });

  const supportHits = events.filter(item => item.kind === "support").length;
  const resistanceHits = events.filter(item => item.kind === "resistance").length;

  return {
    totalCandles: candles.length,
    totalLevels: levels.length,
    totalEvents: events.length,
    supportHits,
    resistanceHits,
    sourceName: "",
    events: events.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}

export function runLongOnlyGannBacktest(candles, levels, turns, options = {}) {
  const optionCapital = Number(options.capital);
  const optionTolerancePct = Number(options.tolerancePct);
  const optionLookaheadBars = Number(options.lookaheadBars);
  const capital = Math.max(0, Number.isFinite(optionCapital) ? optionCapital : 10000);
  const tolerancePct = Math.max(0, Number.isFinite(optionTolerancePct) ? optionTolerancePct : 0.005);
  const lookaheadBars = Math.max(1, Math.round(Number.isFinite(optionLookaheadBars) ? optionLookaheadBars : 20));
  const sortedCandles = normalizeIndexedCandles(candles);
  const sortedTurns = normalizeIndexedTurns(turns, sortedCandles);
  const normalizedLevels = normalizeBacktestLevels(levels);
  const events = [];

  normalizedLevels.forEach(level => {
    sortedCandles.forEach((candle, index) => {
      if (!touchesLevel(candle, level.price, tolerancePct)) return;

      const entryPrice = level.price;
      const shares = entryPrice > 0 ? capital / entryPrice : 0;
      const windowStart = index + 1;
      const windowEnd = Math.min(sortedCandles.length - 1, index + lookaheadBars);
      const futureCandles = sortedCandles.slice(windowStart, windowEnd + 1);
      if (!futureCandles.length || !shares) return;

      const firstTurn = sortedTurns.find(turn => turn.index >= windowStart && turn.index <= windowEnd);
      const exitCandle = firstTurn
        ? sortedCandles[firstTurn.index]
        : futureCandles[futureCandles.length - 1];
      const exitPrice = firstTurn
        ? Number(firstTurn.price)
        : Number(exitCandle.close);
      const highs = futureCandles.map(item => Number(item.high)).filter(Number.isFinite);
      const lows = futureCandles.map(item => Number(item.low)).filter(Number.isFinite);
      const maxHigh = highs.length ? Math.max(...highs) : entryPrice;
      const minLow = lows.length ? Math.min(...lows) : entryPrice;
      const pnl = (exitPrice - entryPrice) * shares;

      events.push({
        levelPrice: roundPrice(level.price),
        matrixValue: level.matrixValue,
        lineType: level.lineType,
        rank: level.rank,
        label: level.label,
        entryDate: formatCandleDate(candle),
        entryIndex: index,
        entryPrice: roundPrice(entryPrice),
        shares,
        exitDate: formatCandleDate(exitCandle),
        exitPrice: roundPrice(exitPrice),
        exitReason: firstTurn ? "turn" : "window",
        turnHit: Boolean(firstTurn),
        turnType: firstTurn?.type || "",
        pnl,
        pnlPct: capital ? pnl / capital : 0,
        maxRunup: (maxHigh - entryPrice) * shares,
        maxRunupPct: entryPrice ? (maxHigh - entryPrice) / entryPrice : 0,
        maxDrawdown: (minLow - entryPrice) * shares,
        maxDrawdownPct: entryPrice ? (minLow - entryPrice) / entryPrice : 0,
      });
    });
  });

  const rows = buildLongOnlyRows(events);
  const totalPnl = sum(events.map(item => item.pnl));
  const hitCount = events.filter(item => item.turnHit).length;
  const winCount = events.filter(item => item.pnl > 0).length;

  return {
    title: "江恩点位做多回测统计",
    subtitle: `本金 $${formatMoney(capital)} · 容差 ±${formatPercent(tolerancePct)} · 后续 ${lookaheadBars} 根K线`,
    capital,
    tolerancePct,
    lookaheadBars,
    totalEvents: events.length,
    hitCount,
    hitRate: ratio(hitCount, events.length),
    totalPnl,
    averagePnl: events.length ? totalPnl / events.length : 0,
    winCount,
    winRate: ratio(winCount, events.length),
    rows,
    events,
  };
}

function mapTrendPoints(points, lineType, clickedValue, matrixStep, anchorPrice, priceUnit) {
  return (points || []).map(point => {
    const matrixValue = point.value ?? point;
    const deltaSteps = (matrixValue - clickedValue) / matrixStep;

    return {
      lineType,
      matrixValue,
      deltaSteps,
      price: anchorPrice + deltaSteps * priceUnit,
    };
  });
}

function normalizeIndexedCandles(candles) {
  return (candles || [])
    .map((candle, index) => ({
      ...candle,
      index,
      timestamp: Number(candle.timestamp ?? normalizeTimestamp(candle.date)),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }))
    .filter(candle => (
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ));
}

function normalizeIndexedTurns(turns, candles) {
  return (turns || [])
    .map(turn => {
      const timestamp = Number(turn.timestamp);
      const index = Number.isFinite(Number(turn.index))
        ? Number(turn.index)
        : candles.findIndex(candle => Number(candle.timestamp) === timestamp);

      return {
        ...turn,
        index,
        timestamp,
        price: Number(turn.price),
      };
    })
    .filter(turn => Number.isFinite(turn.index) && turn.index >= 0 && Number.isFinite(turn.price))
    .sort((a, b) => a.index - b.index);
}

function normalizeBacktestLevels(levels) {
  const buckets = new Map();

  (levels || []).forEach(level => {
    const price = Number(level.price);
    if (!Number.isFinite(price) || price <= 0) return;

    const key = `${roundPrice(price)}:${level.lineType || "main"}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        ...level,
        price,
        lineType: level.lineType || "main",
      });
    }
  });

  return [...buckets.values()];
}

function touchesLevel(candle, price, tolerancePct) {
  const lower = price * (1 - tolerancePct);
  const upper = price * (1 + tolerancePct);
  return Number(candle.low) <= upper && Number(candle.high) >= lower;
}

function buildLongOnlyRows(events) {
  const groups = new Map();

  events.forEach(event => {
    const key = `${event.levelPrice}:${event.lineType}`;
    const current = groups.get(key) || {
      price: event.levelPrice,
      matrixValue: event.matrixValue,
      lineType: event.lineType,
      lineLabel: event.label || `${event.lineType === "main" ? "主线" : "副线"}${event.rank ? ` ${event.rank}` : ""}`,
      tests: 0,
      hits: 0,
      wins: 0,
      totalPnl: 0,
      maxRunup: -Infinity,
      maxDrawdown: Infinity,
      latestDate: "",
    };

    current.tests += 1;
    current.hits += event.turnHit ? 1 : 0;
    current.wins += event.pnl > 0 ? 1 : 0;
    current.totalPnl += event.pnl;
    current.maxRunup = Math.max(current.maxRunup, event.maxRunup);
    current.maxDrawdown = Math.min(current.maxDrawdown, event.maxDrawdown);
    current.latestDate = !current.latestDate || String(event.entryDate).localeCompare(current.latestDate) > 0
      ? event.entryDate
      : current.latestDate;
    groups.set(key, current);
  });

  return [...groups.values()]
    .map(row => ({
      ...row,
      hitRate: ratio(row.hits, row.tests),
      winRate: ratio(row.wins, row.tests),
      averagePnl: row.tests ? row.totalPnl / row.tests : 0,
      maxRunup: Number.isFinite(row.maxRunup) ? row.maxRunup : 0,
      maxDrawdown: Number.isFinite(row.maxDrawdown) ? row.maxDrawdown : 0,
    }))
    .sort((a, b) => a.price - b.price);
}

function roundPrice(value) {
  return Math.round(value * 10000) / 10000;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function formatMoney(value) {
  return Math.round(Number(value) || 0).toLocaleString("en-US");
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatCandleDate(candle) {
  if (candle?.date) return String(candle.date);
  if (Number.isFinite(Number(candle?.timestamp))) {
    return new Date(Number(candle.timestamp)).toISOString().slice(0, 10);
  }
  return "";
}

function normalizeTimestamp(value) {
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getWeekStart(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function findHeaderIndex(headers, aliases) {
  return headers.findIndex(header => aliases.includes(header));
}

function splitCsvRows(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index++;
      }
      row.push(current);
      if (row.some(cell => String(cell).trim() !== "")) {
        rows.push(row);
      }
      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some(cell => String(cell).trim() !== "")) {
    rows.push(row);
  }

  return rows;
}
