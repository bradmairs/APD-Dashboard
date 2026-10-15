import { PaymentClaimStatus } from "./types";

export const PAYMENT_CLAIM_STATUS_LABELS: Record<PaymentClaimStatus, string> = {
  SUBMITTED: "Submitted",
  CERTIFIED: "Certified",
  DISPUTED: "Disputed",
  PAID: "Paid",
};

export const PAYMENT_CLAIM_STATUS_COLORS: Record<PaymentClaimStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CERTIFIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DISPUTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const ALL_PAYMENT_CLAIM_STATUSES: PaymentClaimStatus[] = [
  "SUBMITTED",
  "CERTIFIED",
  "DISPUTED",
  "PAID",
];

const STATUS_RANK: Record<PaymentClaimStatus, number> = {
  DISPUTED: 0,
  SUBMITTED: 1,
  CERTIFIED: 2,
  PAID: 3,
};

// Sorts the claims needing the most action first: disputed and
// submitted (awaiting certification) ahead of certified (awaiting
// payment), with paid claims — the terminal state — sinking last.
export function paymentClaimStatusRank(status: PaymentClaimStatus): number {
  return STATUS_RANK[status];
}
