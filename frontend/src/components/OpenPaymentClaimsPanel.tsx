import { Link } from "react-router-dom";
import { PaymentClaim } from "../types";
import { formatCurrency } from "../format";
import {
  PAYMENT_CLAIM_STATUS_COLORS,
  PAYMENT_CLAIM_STATUS_LABELS,
  paymentClaimStatusRank,
} from "../paymentClaimMeta";

interface Props {
  claims: PaymentClaim[];
  limit?: number;
}

export default function OpenPaymentClaimsPanel({ claims, limit = 8 }: Props) {
  const outstandingClaims = claims.filter((c) => c.status !== "PAID");
  const topClaims = [...outstandingClaims]
    .sort((a, b) => paymentClaimStatusRank(a.status) - paymentClaimStatusRank(b.status))
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Payment Claims Outstanding
        </h2>
        {outstandingClaims.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {outstandingClaims.length} outstanding portfolio-wide
          </span>
        )}
      </div>

      {topClaims.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No payment claims awaiting certification or payment across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topClaims.map((claim) => (
            <li key={claim.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_CLAIM_STATUS_COLORS[claim.status]}`}
                    >
                      {PAYMENT_CLAIM_STATUS_LABELS[claim.status]}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {claim.claimNumber}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(claim.claimedAmount)}
                    </span>
                  </div>
                  {claim.project && (
                    <Link
                      to={`/projects/${claim.project.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      {claim.project.name}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
