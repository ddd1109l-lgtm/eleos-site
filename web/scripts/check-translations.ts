// Lists keys missing from (or stale in) the built-in translations.
import { EN } from "../src/i18n/strings";
import es from "../src/i18n/es";
import vi from "../src/i18n/vi";
import fr from "../src/i18n/fr";
import ht from "../src/i18n/ht";
for (const [name, dict] of [["es", es], ["vi", vi], ["fr", fr], ["ht", ht]] as const) {
  const missing = Object.keys(EN).filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in EN));
  console.log(`${name}: ${missing.length} missing, ${extra.length} extra`);
  if (missing.length) console.log("  missing:", missing.join(" "));
  if (extra.length) console.log("  extra:", extra.join(" "));
}
