import { useState } from "react";
import { Search, X } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";

const DEMO_PNRS = ["SK4821X", "TR1190B", "WL7742"];

export default function BookingTracker({ value, onChange, onSearch, loading, inputRef }) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    if (!trimmed) return;
    onSearch(trimmed.toUpperCase());
  }

  function handleClear() {
    onChange("");
    setTouched(false);
  }

  function handleQuickSelect(pnr) {
    onChange(pnr);
    setTouched(false);
    onSearch(pnr);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
        Track your booking
      </p>
      <GlassCard
        className={`flex items-center gap-2 p-2 transition-shadow duration-300 ${
          loading ? "shadow-[0_0_0_1px_rgba(139,92,246,0.4)]" : ""
        }`}
      >
        <Search size={16} className="ml-2 shrink-0 text-white/40" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your PNR, e.g. SK4821X"
          aria-label="Booking PNR"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder-white/30"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear PNR"
            className="shrink-0 text-white/40 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
        <ActionButton type="submit" loading={loading} className="shrink-0 px-4 py-2">
          Track
        </ActionButton>
      </GlassCard>
      {touched && !trimmed && (
        <p className="mt-1.5 text-xs text-rose-300">Enter a PNR to continue.</p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {DEMO_PNRS.map((pnr) => (
          <button
            key={pnr}
            type="button"
            onClick={() => handleQuickSelect(pnr)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 hover:border-violet-400/40 hover:text-white cursor-pointer"
          >
            {pnr}
          </button>
        ))}
      </div>
    </form>
  );
}
