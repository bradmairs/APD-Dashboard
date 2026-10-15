import { Link } from "react-router-dom";
import { CommunityEnquiry } from "../types";
import { ENQUIRY_STATUS_COLORS, ENQUIRY_STATUS_LABELS, enquiryStatusRank } from "../enquiryMeta";
import { formatDate } from "../format";

interface Props {
  enquiries: CommunityEnquiry[];
  limit?: number;
}

export default function OpenEnquiriesPanel({ enquiries, limit = 8 }: Props) {
  const openEnquiries = enquiries.filter((e) => e.status !== "RESOLVED" && e.status !== "CLOSED");
  const topEnquiries = [...openEnquiries]
    .sort((a, b) => enquiryStatusRank(a.status) - enquiryStatusRank(b.status))
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Open Enquiries
        </h2>
        {openEnquiries.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openEnquiries.length} outstanding portfolio-wide
          </span>
        )}
      </div>

      {topEnquiries.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open community enquiries or complaints across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topEnquiries.map((enquiry) => (
            <li key={enquiry.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${ENQUIRY_STATUS_COLORS[enquiry.status]}`}
                    >
                      {ENQUIRY_STATUS_LABELS[enquiry.status]}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {enquiry.reference ? `${enquiry.reference}: ` : ""}
                      {enquiry.description}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Received {formatDate(enquiry.dateReceived)}
                    </span>
                  </div>
                  {enquiry.project && (
                    <Link
                      to={`/projects/${enquiry.project.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      {enquiry.project.name}
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
