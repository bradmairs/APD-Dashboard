import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { recordVisit } from "../api";
import { ActivityLogEntry, Project } from "../types";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "./icons";

const SESSION_KEY = "apd.sinceVisit";
const DISMISS_KEY = "apd.sinceVisitDismissed";

// "Since your last visit": what other people changed on your projects since
// you were last here. The visit is recorded once per browser session.
export default function SinceLastVisit({ activity, projects }: { activity: ActivityLogEntry[]; projects: Project[] }) {
  const { user } = useAuth();
  const [since, setSince] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (since !== null) return;
    recordVisit()
      .then(({ previousSeenAt }) => {
        const value = previousSeenAt ?? "";
        setSince(value);
        try {
          sessionStorage.setItem(SESSION_KEY, value);
        } catch {
          // fine
        }
      })
      .catch(() => setSince(""));
  }, [since]);

  if (!since || dismissed || !user) return null;
  const mine = new Set(projects.filter((p) => p.projectManagerId === user.id || p.projectManager === user.name).map((p) => p.id));
  const changes = activity.filter(
    (a) => a.createdAt > since && a.userId !== user.id && (!a.projectId || mine.has(a.projectId) || mine.size === 0)
  );
  if (changes.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // fine
    }
  }

  return (
    <section className="card p-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-500/5" aria-labelledby="since-visit">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200 flex items-center justify-center shrink-0">
          <Icon name="activity" className="w-[18px] h-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="since-visit" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {changes.length} update{changes.length === 1 ? "" : "s"} since your last visit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mine.size ? "On projects you manage" : "Across the portfolio"}, since{" "}
            {new Date(since).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {changes.slice(0, 15).map((a) => (
                <li key={a.id} className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{a.userName}</span> {a.action}
                  {a.projectId && (
                    <>
                      {" "}
                      on{" "}
                      <Link to={`/projects/${a.projectId}`} className="text-blue-700 dark:text-blue-300 hover:underline">
                        {a.projectName}
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setExpanded((e) => !e)} className="text-xs text-blue-700 dark:text-blue-300 hover:underline">
            {expanded ? "Hide" : "Show"}
          </button>
          <button type="button" onClick={dismiss} className="icon-btn !w-7 !h-7" aria-label="Dismiss">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
