// Prints every translatable English string as JSON (used to write src/i18n/es.ts and vi.ts).
import { EN } from "../src/i18n/strings";
console.log(JSON.stringify(EN, null, 1));
