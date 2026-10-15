import { ProjectHealth } from "../health";
import { RagStatus } from "../types";
import { RAG_COLORS, RAG_LABELS } from "../ragMeta";

interface Props {
  health: ProjectHealth;
  detailed?: boolean;
}

export default function HealthBadge({ health, detailed }: Props) {
  if (!detailed) {
    return (
      <span
        title={[
          `Schedule: ${RAG_LABELS[health.schedule]} — ${health.reasons.schedule}`,
          `Budget: ${RAG_LABELS[health.budget]} — ${health.reasons.budget}`,
          `Risk: ${RAG_LABELS[health.risk]} — ${health.reasons.risk}`,
        ].join("\n")}
        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${RAG_COLORS[health.overall]}`}
      >
        {RAG_LABELS[health.overall]}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Dot label="Schedule" status={health.schedule} reason={health.reasons.schedule} />
      <Dot label="Budget" status={health.budget} reason={health.reasons.budget} />
      <Dot label="Risk" status={health.risk} reason={health.reasons.risk} />
    </div>
  );
}

function Dot({ label, status, reason }: { label: string; status: RagStatus; reason: string }) {
  return (
    <span
      title={reason}
      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-help ${RAG_COLORS[status]}`}
    >
      {label}: {RAG_LABELS[status]}
    </span>
  );
}
