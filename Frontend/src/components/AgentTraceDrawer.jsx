import SideDrawer from "./SideDrawer";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

// Every entry here is a real event the frontend itself observed (one of its
// own API calls resolving), timestamped when it actually happened. Nothing
// is chain-of-thought or fabricated - see Chat.jsx for where entries are
// appended.
export default function AgentTraceDrawer({ open, onClose, traceLog }) {
  return (
    <SideDrawer open={open} onClose={onClose} title="Agent Trace">
      {traceLog.length === 0 ? (
        <p className="text-sm text-white/40">No events recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {traceLog.map((entry) => (
            <div key={entry.id} className="text-sm">
              <p className="font-mono text-xs text-white/35">{formatTime(entry.time)}</p>
              <p
                className={`mt-0.5 flex items-center gap-1.5 font-medium ${
                  entry.status === "active" ? "text-violet-300" : "text-emerald-300"
                }`}
              >
                <span>{entry.status === "active" ? "◉" : "✓"}</span>
                <span className="font-mono">{entry.event}</span>
              </p>
              {entry.detail && <p className="mt-0.5 text-white/55">{entry.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </SideDrawer>
  );
}
