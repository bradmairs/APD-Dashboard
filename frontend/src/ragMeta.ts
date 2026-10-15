import { RagStatus } from "./types";

export const RAG_LABELS: Record<RagStatus, string> = {
  GREEN: "Green",
  AMBER: "Amber",
  RED: "Red",
};

export const RAG_COLORS: Record<RagStatus, string> = {
  GREEN: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  AMBER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_RAG_STATUSES: RagStatus[] = ["GREEN", "AMBER", "RED"];
