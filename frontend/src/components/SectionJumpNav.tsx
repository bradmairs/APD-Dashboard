export interface JumpSection {
  id: string;
  label: string;
}

interface Props {
  sections: JumpSection[];
}

// Breathing room left between the sticky header and the section jumped to.
const SECTION_GAP = 12;

// A row of "jump to" pills shown above a tab's stacked panels — some tabs
// (Budget & Contract, Site & Records) hold eight or nine panels, so getting
// to the last one means scrolling past everything above it. Clicking a pill
// scrolls that section's wrapper (given the same id below, in
// ProjectDetailPage.tsx) into view instead. Hidden entirely for a tab with
// only one section (AI Assistant), where jumping anywhere is meaningless.
export default function SectionJumpNav({ sections }: Props) {
  if (sections.length <= 1) return null;

  // The page header is sticky, so scrolling a section to the very top of the
  // window (scrollIntoView's "start") tucks the section's own heading under
  // the header and it looks like the page went too far. Offset by the
  // header's height so the section starts just below it instead.
  function jumpTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const header = document.querySelector("header");
    const headerHeight =
      header && getComputedStyle(header).position === "sticky"
        ? header.getBoundingClientRect().height
        : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - SECTION_GAP;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs pb-1">
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
    </div>
  );
}
