import { RiskStatus, RiskType } from "./types";

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  OPEN: "Open",
  MITIGATING: "Mitigating",
  CLOSED: "Closed",
};

export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  MITIGATING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_RISK_STATUSES: RiskStatus[] = ["OPEN", "MITIGATING", "CLOSED"];

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  RISK: "Risk",
  OPPORTUNITY: "Opportunity",
};

export const RISK_TYPE_COLORS: Record<RiskType, string> = {
  RISK: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  OPPORTUNITY: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export const ALL_RISK_TYPES: RiskType[] = ["RISK", "OPPORTUNITY"];
