export interface JumpSection {
  id: string;
  label: string;
}

interface Props {
  sections: JumpSection[];
}

// A row of "jump to" pills shown above a tab's stacked panels — some tabs
// (Budget & Contract, Site & Records) hold eight or nine panels, so getting
// to the last one means scrolling past everything above it. Clicking a pill
// scrolls that section's wrapper (given the same id below, in
// ProjectDetailPage.tsx) into view instead. Hidden entirely for a tab with
// only one section (AI Assistant), where jumping anywhere is meaningless.
export default function SectionJumpNav({ sections }: Props) {
  if (sections.length <= 1) return null;

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
