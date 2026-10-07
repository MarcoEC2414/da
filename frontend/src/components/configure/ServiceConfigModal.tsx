import type { CloudService } from '../../types';
import { getServiceDefinition } from '../../data/awsServices';
import { ServiceForm } from '../services/ServiceForm';
import { Button } from '../ui/Button';

interface ServiceConfigModalProps {
  draft: CloudService | null;
  editingId: string | null;
  onDraftChange: (service: CloudService) => void;
  onClose: () => void;
  onSubmit: (service: CloudService, editingId: string | null) => void;
}

export function ServiceConfigModal({
  draft,
  editingId,
  onDraftChange,
  onClose,
  onSubmit,
}: ServiceConfigModalProps) {
  if (!draft) return null;

  const definition = getServiceDefinition(draft.kind);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] sm:p-7 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-service-title"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
                {definition.provider}
              </span>
              {editingId && (
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                  Modo Edición
                </span>
              )}
            </div>
            <h2 id="modal-service-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {editingId ? `Editar ${draft.name || definition.name}` : `Configurar ${definition.name}`}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {definition.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Formulario técnico */}
        <div className="py-5">
          <p className="mb-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Ajusta los parámetros técnicos del recurso. El cálculo de costo se realizará al procesar la estimación.
          </p>
          <ServiceForm
            definition={definition}
            value={draft.spec}
            onChange={(spec) => onDraftChange({ ...draft, spec })}
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Sin precios hasta pulsar «Calcular estimación»
          </span>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="md"
              onClick={() => onSubmit(draft, editingId)}
              className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold"
            >
              {editingId ? 'Guardar cambios' : 'Añadir a mi estimación'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
