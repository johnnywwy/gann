import { access, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const stockDataDir = join(root, "public", "stockData");
const catalogPath = join(stockDataDir, "catalog.json");

const SYMBOL_GROUPS = {
  INDEX_ETF: {
    label: "指数 / ETF",
    symbols: [
      "SPY.US",
      "QQQ.US",
      "DIA.US",
      "IWM.US",
      "VTI.US"
    ]
  },

  MAGNIFICENT_7: {
    label: "美股七巨头",
    symbols: [
      "AAPL.US",
      "MSFT.US",
      "NVDA.US",
      "GOOGL.US",
      "AMZN.US",
      "META.US",
      "TSLA.US"
    ]
  },

  SEMICONDUCTOR_AI: {
    label: "半导体 / AI 算力",
    symbols: [
      "NVDA.US",
      "AMD.US",
      "AVGO.US",
      "TSM.US",
      "ASML.US"
    ]
  },

  AI_SOFTWARE_CLOUD: {
    label: "AI 软件 / 云 / 网络安全",
    symbols: [
      "PLTR.US",
      "CRM.US",
      "NOW.US",
      "CRWD.US",
      "SNOW.US"
    ]
  },

  SPACE_DEFENSE_DRONE: {
    label: "航天 / 火箭 / 国防 / 无人机",
    symbols: [
      "RKLB.US",
      "LMT.US",
      "NOC.US",
      "RTX.US",
      "AVAV.US"
    ]
  },

  EV_AUTO: {
    label: "电动车 / 汽车 / 自动驾驶",
    symbols: [
      "TSLA.US",
      "RIVN.US",
      "GM.US",
      "F.US",
      "MBLY.US"
    ]
  },

  CLEAN_ENERGY: {
    label: "新能源 / 光伏 / 氢能源",
    symbols: [
      "FSLR.US",
      "ENPH.US",
      "SEDG.US",
      "BE.US",
      "PLUG.US"
    ]
  },

  QUANTUM_COMPUTING: {
    label: "量子计算",
    symbols: [
      "IONQ.US",
      "RGTI.US",
      "QBTS.US",
      "QUBT.US",
      "IBM.US"
    ]
  },

  FINANCE_PAYMENT: {
    label: "金融 / 支付 / 交易平台",
    symbols: [
      "JPM.US",
      "BAC.US",
      "V.US",
      "MA.US",
      "COIN.US"
    ]
  },

  CONSUMER_RETAIL: {
    label: "消费 / 零售 / 餐饮",
    symbols: [
      "WMT.US",
      "COST.US",
      "MCD.US",
      "SBUX.US",
      "HD.US",
      "KO.US"
    ]
  },

  MEDIA_GAMING: {
    label: "流媒体 / 娱乐 / 游戏",
    symbols: [
      "NFLX.US",
      "DIS.US",
      "SPOT.US",
      "EA.US",
      "TTWO.US"
    ]
  },

  HEALTHCARE_PHARMA: {
    label: "医疗 / 制药 / 减肥药",
    symbols: [
      "LLY.US",
      "NVO.US",
      "JNJ.US",
      "MRK.US",
      "UNH.US"
    ]
  },

  ENERGY_OIL: {
    label: "能源 / 石油",
    symbols: [
      "XOM.US",
      "CVX.US",
      "COP.US",
      "OXY.US",
      "SLB.US"
    ]
  },

  WATCHLIST_SMALL_CAP: {
    label: "自选 / 高波动",
    symbols: [
      "ONDS.US",
      "AXTI.US",
      "NVTS.US",
      "LUNR.US",
      "ASTS.US"
    ]
  }
};

function symbolToFileName(symbol) {
  return `${symbol.replace(/\./g, "_")}.json`;
}

function symbolToDisplay(symbol) {
  return symbol.replace(/\./g, "_");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(stockDataDir, { recursive: true });

  const catalog = [];

  for (const [groupKey, group] of Object.entries(SYMBOL_GROUPS)) {
    const children = [];

    for (const symbol of group.symbols) {
      const fileName = symbolToFileName(symbol);
      const displaySymbol = symbolToDisplay(symbol);

      const diskFilePath = join(stockDataDir, fileName);
      const webPath = `stockData/${fileName}`;

      const exists = await fileExists(diskFilePath);

      if (!exists) {
        console.log(`⚠️ 文件不存在，跳过: ${fileName}`);
        continue;
      }

      children.push({
        label: displaySymbol,
        value: webPath
      });
    }

    if (children.length > 0) {
      catalog.push({
        label: group.label,
        value: groupKey,
        children
      });
    }
  }

  await writeFile(
    catalogPath,
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf-8"
  );

  console.log(`✅ Generated ${catalog.length} groups at ${catalogPath}`);
}

main().catch(error => {
  console.error("Generate stock catalog failed:", error);
  process.exit(1);
});