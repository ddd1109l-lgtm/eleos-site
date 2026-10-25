#!/usr/bin/env bash
# Live check of /api/transcribe against the real speech-to-text model (macOS only: uses `say` and `afconvert`).
# Start the server first (npm run dev), then:  bash scripts/voice-smoke.sh
# API_URL overrides the server (default http://localhost:8787/api).
set -euo pipefail

API_URL="${API_URL:-http://localhost:8787/api}"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

clip() { # name, sentence
  say -o "$DIR/$1.aiff" "$2"
  afconvert -f WAVE -d LEI16 "$DIR/$1.aiff" "$DIR/$1.wav"
}

clip q1 "What counts as income?"
clip q2 "My social security number is one two three, four five, six seven eight nine"

failures=0
for q in q1 q2; do
  secs="$(curl -s -o "$DIR/$q.json" -w '%{time_total}' -F "audio=@$DIR/$q.wav" "$API_URL/transcribe")"
  body="$(cat "$DIR/$q.json")"
  # Checks run in node so we can parse JSON; output never contains raw digits for q2 (each digit becomes #).
  if CASE="$q" SECS="$secs" node -e '
    const body = process.argv[1];
    const q = process.env.CASE;
    let r;
    try { r = JSON.parse(body); } catch { r = null; }
    const shape = (s) => String(s).replace(/[0-9]/g, "#");
    const failed = [];
    if (!r || typeof r.text !== "string") failed.push("response has text");
    if (q === "q1") {
      const words = (r?.text ?? "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);
      for (const w of ["what", "counts", "as", "income"]) if (!words.includes(w)) failed.push(`text has "${w}"`);
      if (r?.privacy?.masked !== false) failed.push("privacy.masked is false");
    } else {
      if (!(r?.text ?? "").includes("[SSN removed]")) failed.push("text has [SSN removed]");
      if (r?.privacy?.masked !== true) failed.push("privacy.masked is true");
      if (/6789|6 7 8 9/.test(body)) failed.push("no 6789 / 6 7 8 9 anywhere in the response");
    }
    const text = q === "q1" ? r?.text : shape(r?.text ?? body);
    console.log(`${failed.length ? "FAIL" : "PASS"}  ${q}  (${process.env.SECS} s)${failed.length ? "  failed: " + failed.join("; ") : ""}`);
    console.log(`  text:     ${text}`);
    console.log(`  privacy:  ${JSON.stringify(r?.privacy ?? null)}`);
    process.exit(failed.length ? 1 : 0);
  ' "$body"; then :; else failures=$((failures + 1)); fi
done

exit "$failures"
