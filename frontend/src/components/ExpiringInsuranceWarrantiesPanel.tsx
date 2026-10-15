import { Link } from "react-router-dom";
import { InsuranceWarranty } from "../types";
import { formatDate } from "../format";
import {
  INSURANCE_WARRANTY_TYPE_LABELS,
  isInsuranceWarrantyExpired,
  isInsuranceWarrantyExpiringSoon,
} from "../insuranceWarrantyMeta";

interface Props {
  items: InsuranceWarranty[];
  limit?: number;
}

export default function ExpiringInsuranceWarrantiesPanel({ items, limit = 8 }: Props) {
  const flagged = items.filter(
    (i) => isInsuranceWarrantyExpired(i) || isInsuranceWarrantyExpiringSoon(i)
  );
  const sorted = [...flagged].sort(
    (a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
  );
  const topItems = sorted.slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Insurance &amp; Warranties Expiring Soon
        </h2>
        {flagged.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {flagged.length} portfolio-wide
          </span>
        )}
      </div>

      {topItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No insurance or warranties expiring soon across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topItems.map((item) => {
            const expired = isInsuranceWarrantyExpired(item);
            return (
              <li key={item.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {INSURANCE_WARRANTY_TYPE_LABELS[item.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.project && (
                      <Link
                        to={`/projects/${item.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block"
                      >
                        {item.project.name}
                      </Link>
                    )}
                  </div>
                  <span
                    className={`text-xs shrink-0 font-medium ${
                      expired
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {expired ? "Expired " : "Expires "}
                    {formatDate(item.expiryDate)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
