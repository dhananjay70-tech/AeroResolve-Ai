import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { customerApi, escalationApi } from "../services/api";
import { escalationStorage } from "../utils/escalationStorage";
import { pnrStorage } from "../utils/storage";
import EscalationCard from "../components/EscalationCard";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

export default function Escalation() {
  const location = useLocation();
  const navigate = useNavigate();
  const escalationId = location.state?.escalationId || escalationStorage.get(pnrStorage.get());

  const [escalation, setEscalation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(Boolean(escalationId));
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setCustomer(null);
    try {
      const res = await escalationApi.getById(escalationId);
      setEscalation(res.data);

      const pnr = res.data.requestedAction?.pnr || pnrStorage.get();
      if (pnr) {
        // Best-effort case context enrichment - the escalation itself
        // already loaded successfully either way.
        customerApi.getByPnr(pnr).then((customerRes) => setCustomer(customerRes.data)).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (escalationId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalationId]);

  if (!escalationId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No escalation to show"
        description="When a request needs supervisor review, raise it from the AI Assistant or your dashboard, and it will appear here with its status."
        actionLabel="Go to AI Assistant"
        onAction={() => navigate("/chat")}
      />
    );
  }

  if (loading) return <LoadingScreen label="Loading escalation" />;

  if (error) {
    return <ErrorState title="Unable to load this escalation." message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Escalation Status</h1>
        <p className="mt-1 text-sm text-white/50">
          Requests beyond standard policy are reviewed by a supervisor.
        </p>
      </div>
      <EscalationCard escalation={escalation} customer={customer} />
    </div>
  );
}
