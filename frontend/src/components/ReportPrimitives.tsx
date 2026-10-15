import { ReactNode } from "react";
import { RagStatus } from "../types";
import { RAG_COLORS, RAG_LABELS } from "../ragMeta";

// Shared building blocks for printable report pages (Monthly Report,
// Project Closeout Report) — light-only styling with print: variants,
// deliberately not dark-mode aware since these pages are meant to be
// printed/exported to PDF, not read on screen at night.

export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6 print:break-inside-avoid">
      <div className="bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-t">
        {title}
      </div>
      <div className="border border-t-0 border-slate-200 rounded-b p-4">{children}</div>
    </div>
  );
}

export function ReportField({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${negative ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

export function NarrativeBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-medium text-slate-500 mb-1">{title}</div>
      <p className="text-sm text-slate-700 whitespace-pre-line">{text}</p>
    </div>
  );
}

export function HealthRow({
  label,
  health,
  comments,
}: {
  label: string;
  health: RagStatus;
  comments: string | null;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="shrink-0">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${RAG_COLORS[health]}`}>
          {RAG_LABELS[health]}
        </span>
      </div>
      {comments && (
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1">Comments</div>
          <p className="text-slate-700">{comments}</p>
        </div>
      )}
    </div>
  );
}
