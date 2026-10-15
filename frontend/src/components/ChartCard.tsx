import { ReactNode } from "react";

export default function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
