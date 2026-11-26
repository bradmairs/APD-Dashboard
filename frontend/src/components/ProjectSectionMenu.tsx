import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProjects } from "../api";
import { batched } from "../batch";
import { Project } from "../types";
import { JumpSection } from "./SectionJumpNav";

interface Props<T extends string> {
  projectId: string;
  tabs: { id: T; label: string }[];
  sections: Record<T, JumpSection[]>;
  // Item count per section id, shown beside each section.
  counts: Record<string, number>;
  activeTab: T;
  onSelectTab: (tab: T) => void;
  // Show every long list in the current group in full, or back to a few.
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  hideEmpty?: boolean;
  onToggleHideEmpty?: () => void;
}

// Breathing room left between the sticky top bar and the section jumped to.
const SECTION_GAP = 12;

function scrollToSection(id: string, attempt = 0) {
  const target = document.getElementById(id);
  if (!target) {
    // The group's sections may still be loading: try again for ~2 seconds.
    if (attempt < 20) window.setTimeout(() => scrollToSection(id, attempt + 1), 100);
    return;
  }
  const header = document.querySelector("header");
  const covered = header ? header.getBoundingClientRect().height : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - covered - SECTION_GAP;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

// The project page's own menu, in a column beside the main menu on wide
// screens: every group (the old tabs) with its sections listed under the
// open one, so any section is one click away. Also: back to all projects,
// and a quick switch to another project. (On a phone the page keeps the
// tabs and Jump-to row instead.)
export default function ProjectSectionMenu<T extends string>({
  projectId,
  tabs,
  sections,
  counts,
  activeTab,
  onSelectTab,
  onExpandAll,
  onCollapseAll,
  hideEmpty,
  onToggleHideEmpty,
}: Props<T>) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    batched(() => getProjects(), { preferCache: true })
      .then((list) => setProjects([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setProjects([]));
  }, []);

  function goTo(tab: T, sectionId?: string) {
    if (tab !== activeTab) onSelectTab(tab);
    if (sectionId) {
      // Let the group render before measuring where the section is.
      window.setTimeout(() => requestAnimationFrame(() => scrollToSection(sectionId)), tab !== activeTab ? 60 : 0);
    } else if (tab !== activeTab) {
      window.scrollTo({ top: 0 });
    }
  }

  return (
    <nav
      aria-label="Project sections"
      className="w-60 h-full flex flex-col bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800"
    >
      <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
        <Link to="/?tab=projects" className="block text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← All projects
        </Link>
        {projects.length > 1 && (
          <select
            aria-label="Switch to another project"
            value={projectId}
            onChange={(e) => navigate(`/projects/${e.target.value}`)}
            className="w-full text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {tabs.map((tab) => {
          const open = tab.id === activeTab;
          const list = sections[tab.id] ?? [];
          const total = list.reduce((sum, s) => sum + (counts[s.id] ?? 0), 0);
          return (
            <div key={tab.id}>
              <button
                type="button"
                onClick={() => goTo(tab.id)}
                aria-current={open ? "page" : undefined}
                aria-expanded={list.length > 0 ? open : undefined}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left ${
                  open
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="flex-1 min-w-0 truncate">{tab.label}</span>
                {total > 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{total}</span>
                )}
                {list.length > 0 && (
                  <span aria-hidden="true" className="text-slate-500 text-xs">
                    {open ? "▾" : "▸"}
                  </span>
                )}
              </button>
              {open && list.length > 0 && (
                <ul className="mt-0.5 mb-2 ml-3 border-l border-slate-200 dark:border-slate-700">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => goTo(tab.id, s.id)}
                        className="w-full flex items-center gap-2 pl-3 pr-2 py-1.5 text-[13px] text-left text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <span className="flex-1 min-w-0 truncate">{s.label}</span>
                        {(counts[s.id] ?? 0) > 0 && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{counts[s.id]}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {(onExpandAll || onCollapseAll || onToggleHideEmpty) && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {onToggleHideEmpty && (
            <label className="w-full flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer" title="Only for this project, in this browser. Nothing is deleted.">
              <input type="checkbox" checked={!!hideEmpty} onChange={onToggleHideEmpty} />
              Hide empty sections
            </label>
          )}
          {onExpandAll && (
            <button type="button" onClick={onExpandAll} className="text-blue-600 dark:text-blue-400 hover:underline">
              Expand all
            </button>
          )}
          {onCollapseAll && (
            <button type="button" onClick={onCollapseAll} className="text-blue-600 dark:text-blue-400 hover:underline">
              Collapse all
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
