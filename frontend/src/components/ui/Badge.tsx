import type { ReactNode } from 'react';
import type { ServiceKind } from '../../types';
import { SERVICE_KIND_LABELS, serviceKindStyle } from '../../data/awsServices';

export function ServiceBadge({ kind }: { kind: ServiceKind }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${serviceKindStyle(kind)}`}>
      {SERVICE_KIND_LABELS[kind]}
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}