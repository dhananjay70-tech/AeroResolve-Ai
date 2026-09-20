const STATUS_STYLES = {
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  delayed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  scheduled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  info: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export default function StatusBadge({ status, label }) {
  const style = STATUS_STYLES[status?.toLowerCase()] || STATUS_STYLES.info;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || status}
    </span>
  );
}
