import type { CloudService, ServiceKind } from '../../types';
import { createServiceFromKind } from '../../data/awsServices';
import { RegionSelectorCard } from './RegionSelectorCard';
import { ServicesGrid } from './ServicesGrid';
import { CurrentConfigPanel } from './CurrentConfigPanel';
import { ServiceConfigModal } from './ServiceConfigModal';

interface ConfigurePanelProps {
  draft: CloudService | null;
  editingId: string | null;
  onDraftChange: (service: CloudService | null) => void;
  onCancel: () => void;
  onSubmit: (service: CloudService, editingId: string | null) => void;
  onCalculate: () => void;
}

export function ConfigurePanel({
  draft,
  editingId,
  onDraftChange,
  onCancel,
  onSubmit,
  onCalculate,
}: ConfigurePanelProps) {
  const handleConfigureKind = (kind: ServiceKind) => {
    onDraftChange(createServiceFromKind(kind, crypto.randomUUID()));
  };

  const handleEditService = (service: CloudService) => {
    onDraftChange(service);
  };

  const handleScrollToRegion = () => {
    const el = document.getElementById('region-selector');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Contenido Principal: Región + Grid de Servicios */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Nueva estimación
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Selecciona la región y configura los servicios de AWS que deseas incluir en tu estimación.
          </p>
        </div>

        {/* Tarjeta de Región */}
        <RegionSelectorCard />

        {/* Cuadrícula de Servicios de AWS */}
        <ServicesGrid onConfigureKind={handleConfigureKind} />
      </div>

      {/* Panel Derecho: Configuración actual (sin precios) + CTA Calcular */}
      <CurrentConfigPanel
        onEditService={handleEditService}
        onCalculate={onCalculate}
        onFocusRegion={handleScrollToRegion}
      />

      {/* Modal / Diálogo de Configuración de Servicio */}
      <ServiceConfigModal
        draft={draft}
        editingId={editingId}
        onDraftChange={(s) => onDraftChange(s)}
        onClose={onCancel}
        onSubmit={onSubmit}
      />
    </div>
  );
}