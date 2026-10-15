import { TenderPackage, TenderMethod, TenderStatus } from "./types";

export const TENDER_METHOD_LABELS: Record<TenderMethod, string> = {
  OPEN: "Open Tender",
  SELECTIVE: "Selective Tender",
  DIRECT_ENGAGE: "Direct Engagement",
  EXPRESSION_OF_INTEREST: "Expression of Interest",
};

export const ALL_TENDER_METHODS: TenderMethod[] = [
  "OPEN",
  "SELECTIVE",
  "DIRECT_ENGAGE",
  "EXPRESSION_OF_INTEREST",
];

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  PLANNED: "Planned",
  ISSUED: "Issued",
  EVALUATION: "Evaluation",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

export const TENDER_STATUS_COLORS: Record<TenderStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  ISSUED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  EVALUATION: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  AWARDED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through",
};

export const ALL_TENDER_STATUSES: TenderStatus[] = [
  "PLANNED",
  "ISSUED",
  "EVALUATION",
  "AWARDED",
  "CANCELLED",
];

// Sorts in-progress packages (issued/under evaluation) first since they need
// attention soonest, then planned, with awarded/cancelled packages — settled,
// nothing left to do — last. The same "what's still open" framing as
// safetyInspectionRank, adapted for a status that isn't a simple open/closed
// binary.
const RANK: Record<TenderStatus, number> = {
  ISSUED: 0,
  EVALUATION: 0,
  PLANNED: 1,
  AWARDED: 2,
  CANCELLED: 2,
};

export function tenderPackageRank(tenderPackage: TenderPackage): number {
  return RANK[tenderPackage.status];
}
