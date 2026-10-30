import { useEffect, useRef, useState } from "react";

export interface JumpSection {
  id: string;
  label: string;
}

interface Props {
  sections: JumpSection[];
  // Show every list in this tab in full, or back to its first few items
  // (see useShowMore). Omitted when the tab has no long lists.
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  // Called before scrolling, e.g. to expand a collapsed target section.
  onJump?: (id: string) => void;
}

// Breathing room left between the sticky bars and the section jumped to.
const SECTION_GAP = 12;

function stickyHeaderHeight(): number {
  const header = document.querySelector("header");
  return header && getComputedStyle(header).position === "sticky"
    ? header.getBoundingClientRect().height
    : 0;
}

// A row of "jump to" pills shown above a tab's stacked panels — some tabs
// (Budget & Contract, Site & Records) hold eight or nine panels, so getting
// to the last one means scrolling past everything above it. Clicking a pill
// scrolls that section's wrapper (given the same id below, in
// ProjectDetailPage.tsx) into view instead. Hidden entirely for a tab with
// only one section (AI Assistant), where jumping anywhere is meaningless.
export default function SectionJumpNav({ sections, onExpandAll, onCollapseAll, onJump }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  // The row sticks just under the page header, whose height changes with the
  // window width (its buttons wrap), so track it rather than hard-coding it.
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setHeaderHeight(stickyHeaderHeight());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  if (sections.length <= 1) return null;

  // The page header and this row are both sticky, so scrolling a section to
  // the very top of the window would tuck its heading under them. Offset by
  // their combined height so the section starts just below them instead.
  function jumpTo(id: string) {
    onJump?.(id);
    // Let an expanded section render before measuring where it is.
    requestAnimationFrame(() => scrollToSection(id));
  }

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    // Clear both the sticky header and this sticky row.
    const covered = stickyHeaderHeight() + (barRef.current?.getBoundingClientRect().height ?? 0);
    const top = target.getBoundingClientRect().top + window.scrollY - covered - SECTION_GAP;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  return (
    <div
      ref={barRef}
      style={{ top: headerHeight }}
      className="sticky z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap text-xs"
    >
      <span className="text-slate-400 dark:text-slate-500 shrink-0">Jump to:</span>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => jumpTo(section.id)}
          className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
        >
          {section.label}
        </button>
      ))}
      {onExpandAll && onCollapseAll && (
        <span className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={onExpandAll}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Expand all
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <button
            type="button"
            onClick={onCollapseAll}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Collapse all
          </button>
        </span>
      )}
    </div>
  );
}
