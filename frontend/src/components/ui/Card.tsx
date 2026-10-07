import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-[#0f172a] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}