import type { ReactNode } from "react";

export default function WorkspacePageHeading({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className} mb-6 flex flex-wrap items-end justify-between gap-3`}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="ml-auto flex items-center gap-3">{action}</div>}
    </div>
  );
}
