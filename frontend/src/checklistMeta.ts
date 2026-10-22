import { ChecklistItemStatus, ChecklistPhase } from "./types";

export const CHECKLIST_PHASE_LABELS: Record<ChecklistPhase, string> = {
  COMMISSIONING: "Commissioning",
  HANDOVER: "Handover",
  PROCUREMENT: "Procurement",
};

export const CHECKLIST_PHASE_COLORS: Record<ChecklistPhase, string> = {
  COMMISSIONING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  HANDOVER: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  PROCUREMENT: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

export const ALL_CHECKLIST_PHASES: ChecklistPhase[] = ["COMMISSIONING", "HANDOVER", "PROCUREMENT"];

export const CLOSEOUT_CHECKLIST_PHASES: ChecklistPhase[] = ["COMMISSIONING", "HANDOVER"];

// A starting point for a project's procurement checklist, added in one click
// from the Procurement tab and then edited or marked N/A as needed.
export const STANDARD_PROCUREMENT_CHECKLIST: { title: string; description?: string }[] = [
  { title: "Procurement plan and method approved" },
  { title: "Budget and funding confirmed for the procurement" },
  { title: "Scope / specification and drawings finalised" },
  { title: "Pre-tender estimate prepared" },
  { title: "Evaluation criteria and weightings set" },
  { title: "Evaluation panel nominated and conflict of interest declarations signed" },
  { title: "Tender documents reviewed and approved for issue" },
  { title: "Tender advertised / invitations issued" },
  { title: "Addenda and tenderer queries managed" },
  { title: "Tenders received and opened" },
  { title: "Compliance / conformance check completed" },
  { title: "Tender evaluation and scoring completed" },
  { title: "Reference and financial checks completed" },
  { title: "Tender evaluation report and recommendation approved" },
  { title: "Delegation / approval to award obtained" },
  { title: "Contract awarded and executed" },
  { title: "Unsuccessful tenderers notified and debriefed" },
  { title: "Contract details recorded (contract register / PO raised)" },
];

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  NOT_APPLICABLE: "Not Applicable",
};

export const CHECKLIST_STATUS_COLORS: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  COMPLETE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  NOT_APPLICABLE: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export const ALL_CHECKLIST_STATUSES: ChecklistItemStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "NOT_APPLICABLE",
];
