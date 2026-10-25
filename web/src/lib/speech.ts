export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
