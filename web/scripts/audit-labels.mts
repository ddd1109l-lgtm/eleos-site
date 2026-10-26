// Lists what Dr. Fawn explains for every text run on every state form, grouped by topic, so each
// match can be checked by eye. Run: npx tsx --tsconfig tsconfig.json scripts/audit-labels.mts out.txt
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { genericFieldFor } from "@/data/genericFields";

// For every text run on every form, reproduce what the app shows when that run is tapped.
const out: Record<string, Set<string>> = {};
const add = (k: string, v: string) => (out[k] ??= new Set()).add(v);
const dir = "public/forms";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".pdf"))) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(`${dir}/${file}`)), verbosity: 0 }).promise;
  for (let p = 1; p <= doc.numPages; p++) {
    const items = (await (await doc.getPage(p)).getTextContent()).items
      .filter((i): i is TextItem => "str" in i && !!i.str.trim())
      .map((i) => ({ text: i.str.replace(/\s+/g, " ").trim(), x: i.transform[4], y: i.transform[5], h: i.height || 8 }));
    for (const it of items) {
      const row = items.filter((o) => Math.abs(o.y - it.y) < Math.max(it.h * 0.6, 3)).sort((a, b) => a.x - b.x);
      const line = row.map((o) => o.text).join(" ").replace(/\s+/g, " ").trim();
      const runTopic = it.text !== line ? genericFieldFor(it.text) : undefined;
      const topic = runTopic ?? genericFieldFor(line);
      const shown = runTopic ? it.text : line;
      add(topic?.id ?? "(none)", `${file.replace(".pdf", "")} p${p}: ${shown.slice(0, 140)}`);
    }
  }
}
const lines: string[] = [];
for (const [k, v] of Object.entries(out).sort()) {
  lines.push(`\n=== ${k} (${v.size})`);
  lines.push(...[...v]);
}
writeFileSync(process.argv[2], lines.join("\n"));
console.log(Object.entries(out).map(([k, v]) => `${k}:${v.size}`).join("  "));
