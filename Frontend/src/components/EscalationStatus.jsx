import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { escalationApi } from "../services/api";
import { escalationStorage } from "../utils/escalationStorage";
import EscalationCard from "./EscalationCard";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import LoadingSkeleton from "./LoadingSkeleton";

export default function EscalationStatus({ pnr, customer }) {
  const navigate = useNavigate();
  const escalationId = escalationStorage.get(pnr);

  const [escalation, setEscalation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!escalationId) {
      setEscalation(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    escalationApi
      .getById(escalationId)
      .then((res) => {
        if (!cancelled) setEscalation(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [escalationId]);

  if (!escalationId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No active escalation"
        description="Requests beyond standard policy will appear here once submitted."
        className="flex h-full flex-col items-center justify-center p-8 text-center"
      />
    );
  }

  if (loading) return <LoadingSkeleton variant="card" className="h-full min-h-[14rem]" />;

  if (error) {
    return <ErrorState title="Unable to load this escalation." message={error} />;
  }

  return (
    <div className="space-y-3">
      <EscalationCard escalation={escalation} customer={customer} />
      <button
        type="button"
        onClick={() => navigate("/escalations", { state: { escalationId } })}
        className="text-xs font-semibold text-violet-300 hover:text-violet-200 cursor-pointer"
      >
        View escalation →
      </button>
    </div>
  );
}
