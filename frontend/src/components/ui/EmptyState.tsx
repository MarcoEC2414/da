import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      {icon ? <div className="text-slate-300 dark:text-slate-600">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}