import type { InputHTMLAttributes } from 'react';

export function NumberInput({
  label,
  suffix,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; suffix?: string }) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span> : null}
      <div className="relative">
        <input
          type="number"
          className={`h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${suffix ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}