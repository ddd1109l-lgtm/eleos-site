// SAMPLE documents with made-up data, so people know what to look for on their own papers.
// The Medicare Number deliberately breaks the real format (it uses S and O) so it can never be real.

import type { DocId } from "@/data/form";

type Props = { spot?: string; compact?: boolean };

export default function MockDoc({ id, spot, compact }: Props & { id: DocId }) {
  if (id === "medicare_card") return <MedicareCard spot={spot} compact={compact} />;
  if (id === "award_letter") return <AwardLetter spot={spot} compact={compact} />;
  return <BankStatement spot={spot} compact={compact} />;
}

function Spot({ on, children, className = "" }: { on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md px-1.5 py-0.5 transition ${
        on ? "doc-spot relative z-[1] bg-sun-soft outline-[3px] outline-accent outline-offset-2 [outline-style:solid]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Stamp() {
  return (
    <span
      aria-label="Sample document"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-[3px] border-coral px-2 py-0.5 font-display text-xl font-bold tracking-widest text-coral opacity-80"
    >
      SAMPLE
    </span>
  );
}

function MedicareCard({ spot, compact }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-ink bg-white font-sans text-ink shadow-[0_3px_0_var(--ink)] ${compact ? "text-[0.78rem]" : "text-[0.9rem]"}`}>
      <div className="flex items-center justify-between bg-[#1c3f94] px-3 py-1.5 text-white">
        <span className="font-bold tracking-wide">MEDICARE</span>
        <span className="text-[0.7em] tracking-wide">HEALTH INSURANCE</span>
      </div>
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="text-[0.75em] text-muted">Name/Nombre</div>
        <Spot on={spot === "name"}>
          <span className="font-bold tracking-wide">DOROTHY A SAMPLE</span>
        </Spot>
        <div className="text-[0.75em] text-muted">Medicare Number/Número de Medicare</div>
        <Spot on={spot === "number"}>
          <span className="font-mono font-bold tracking-wider">1EG4-SO5-MK73</span>
        </Spot>
        <div className="grid grid-cols-2 gap-x-3 pt-1 text-[0.75em]">
          <span className="text-muted">Entitled to</span>
          <span className="text-muted">Coverage starts</span>
          <span>HOSPITAL (PART A)</span>
          <span>03-01-2017</span>
          <span>MEDICAL (PART B)</span>
          <span>03-01-2017</span>
        </div>
      </div>
      <div className="h-2 bg-[#c8102e]" />
      <Stamp />
    </div>
  );
}

function AwardLetter({ spot, compact }: Props) {
  return (
    <div className={`relative rounded-xl border-2 border-ink bg-white px-4 py-3 font-sans text-ink shadow-[0_3px_0_var(--ink)] ${compact ? "text-[0.78rem]" : "text-[0.9rem]"}`}>
      <div className="border-b border-line pb-1.5">
        <div className="font-bold">Social Security Administration</div>
        <div className="text-[0.75em] text-muted">Notice of benefit amount · Made-up example</div>
      </div>
      <p className="pt-2 text-[0.85em]">Dear Dorothy A. Sample,</p>
      <p className="pt-1 text-[0.85em] text-ink-2">Here is your monthly Social Security benefit:</p>
      <div className="mt-2 space-y-1 text-[0.9em]">
        <Spot on={spot === "before"} className="flex justify-between gap-3">
          <span>Monthly benefit before deductions</span>
          <strong>$1,180.00</strong>
        </Spot>
        <div className="flex justify-between gap-3 px-1.5">
          <span>Medical insurance (Part B) premium</span>
          <span>−$202.90</span>
        </div>
        <Spot on={spot === "after"} className="flex justify-between gap-3 border-t border-line pt-1">
          <span>Amount we pay you after deductions</span>
          <span>$977.10</span>
        </Spot>
      </div>
      <Spot on={spot === "monthly"} className="mt-2 text-[0.8em] text-ink-2">
        We pay your benefit every month.
      </Spot>
      <Stamp />
    </div>
  );
}

function BankStatement({ spot, compact }: Props) {
  return (
    <div className={`relative rounded-xl border-2 border-ink bg-white px-4 py-3 font-sans text-ink shadow-[0_3px_0_var(--ink)] ${compact ? "text-[0.78rem]" : "text-[0.9rem]"}`}>
      <div className="flex items-baseline justify-between border-b border-line pb-1.5">
        <span className="font-bold text-[#0f6a54]">Bayou Sample Bank</span>
        <span className="text-[0.75em] text-muted">Monthly statement</span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2 text-[0.85em]">
        <span className="text-muted">Account owner</span>
        <span>Dorothy A. Sample</span>
        <span className="text-muted">Account type</span>
        <span>Checking</span>
        <span className="text-muted">Statement period</span>
        <span>Sep 1 – Sep 30, 2026</span>
      </div>
      <Spot on={spot === "balance"} className="mt-2 flex justify-between gap-3 border-t border-line pt-1.5 text-[0.95em]">
        <span>Ending balance</span>
        <strong>$2,412.36</strong>
      </Spot>
      <Stamp />
    </div>
  );
}
