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
 * Normalize the local JSON daily-bar format used under public/stockData.
 */
export function parseStockJson(raw) {
  const source = typeof raw === "string" ? JSON.parse(raw) : raw;
  const rows = flattenStockRows(source);

  return rows
    .map(item => {
      const date = String(item.timestamp ?? item.date ?? "").slice(0, 10);
      const open = toNumber(item.open);
      const high = toNumber(item.high);
      const low = toNumber(item.low);
      const close = toNumber(item.close);
      const volume = toNumber(item.volume);

      if (!date || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
        return null;
      }

      return {
        date,
        open: Number.isFinite(open) ? open : close,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : 0,
      };
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

function roundPrice(value) {
  return Math.round(value * 10000) / 10000;
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function flattenStockRows(source) {
  if (Array.isArray(source)) {
    return source.flatMap(item => {
      if (Array.isArray(item)) return flattenStockRows(item);
      if (Array.isArray(item?.data)) return flattenStockRows(item.data);
      if (Array.isArray(item?.candles)) return flattenStockRows(item.candles);
      if (Array.isArray(item?.items)) return flattenStockRows(item.items);
      return [item];
    });
  }

  if (Array.isArray(source?.data)) return flattenStockRows(source.data);
  if (Array.isArray(source?.candles)) return flattenStockRows(source.candles);
  if (Array.isArray(source?.items)) return flattenStockRows(source.items);
  if (Array.isArray(source?.segments)) return flattenStockRows(source.segments);

  return [];
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
