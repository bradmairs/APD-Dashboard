import { Link } from "react-router-dom";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { ActivityLogEntry } from "../types";
import { formatRelativeTime } from "../format";

interface Props {
  entries: ActivityLogEntry[];
  showProjectLink?: boolean;
  emptyMessage?: string;
}

export default function ActivityFeed({
  entries,
  showProjectLink = false,
  emptyMessage = "No activity yet.",
}: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
        {emptyMessage}
      </p>
    );
  }

  const shown = useShowMore(entries);

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
        {shown.visible.map((entry) => (
          <li key={entry.id} className="py-2 text-sm">
            <div className="text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {entry.userName}
              </span>{" "}
              {entry.action}
              {showProjectLink &&
                (entry.projectId ? (
                  <>
                    {" "}
                    on{" "}
                    <Link
                      to={`/projects/${entry.projectId}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {entry.projectName}
                    </Link>
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    on {entry.projectName}
                  </span>
                ))}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {formatRelativeTime(entry.createdAt)}
            </div>
          </li>
        ))}
      </ul>
      <ShowMoreButton state={shown} noun="entries" />
    </>
  );
}
