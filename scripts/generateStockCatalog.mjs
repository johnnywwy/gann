import { readdir, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const stockDataDir = join(root, "public", "stockData");
const catalogPath = join(stockDataDir, "catalog.json");

async function collectJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      entry.name !== "catalog.json" &&
      !entry.name.includes("Zone.Identifier")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectJsonFiles(stockDataDir);
const grouped = new Map();

files.forEach(file => {
  const relativePath = relative(stockDataDir, file);
  const parts = relativePath.split(sep);
  const symbol = parts[0];
  const label = parts.slice(1).join("/");
  const path = `stockData/${parts.join("/")}`;

  if (!grouped.has(symbol)) {
    grouped.set(symbol, []);
  }

  grouped.get(symbol).push({ label, path });
});

const catalog = Array.from(grouped.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([symbol, symbolFiles]) => ({
    symbol,
    files: symbolFiles.sort((a, b) => a.label.localeCompare(b.label)),
  }));

await writeFile(`${catalogPath}`, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`Generated ${catalog.length} stock entries at ${catalogPath}`);
