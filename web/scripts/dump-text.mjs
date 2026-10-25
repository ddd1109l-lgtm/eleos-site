import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
const data = new Uint8Array(fs.readFileSync(process.argv[2]));
const doc = await getDocument({ data }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  for (const it of tc.items) {
    if (!it.str.trim()) continue;
    const [, , , , x, y] = it.transform;
    console.log(`p${p}\t${x.toFixed(0)}\t${(vp.height - y).toFixed(0)}\t${it.str}`);
  }
}
