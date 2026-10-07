import { useMemo, useRef, useState } from 'react';
import type { CloudService, ServiceKind } from './types';
import { createServiceFromKind } from './data/awsServices';
import { EstimationProvider, useEstimation } from './state/EstimationProvider';
import { QuotesProvider } from './state/QuotesProvider';
import { Header } from './components/layout/Header';
import { AppSidebar, type SidebarNavView } from './components/layout/AppSidebar';
import { ConfigurePanel } from './components/configure/ConfigurePanel';
import { EstimatePanel } from './components/estimate/EstimatePanel';
import { RegionMap } from './components/map/RegionMap';
import { ScenariosPanel } from './components/configure/ScenariosPanel';
import { SavingsHint } from './components/estimate/SavingsHint';
import { useRegionQuotes } from './hooks/useRegionQuotes';
import { Button } from './components/ui/Button';

type Step = 'config' | 'result';

function MainLayout() {
  const { state, setRegion, addServiceWithSpec, updateService } = useEstimation();
  const [step, setStep] = useState<Step>('config');
  const [navView, setNavView] = useState<SidebarNavView>('estimate');
  const [draft, setDraft] = useState<CloudService | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastCalculatedHash, setLastCalculatedHash] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement | null>(null);

  // Generar hash del estado actual para detectar si la configuración ha cambiado tras calcular
  const currentStateHash = useMemo(
    () => JSON.stringify({ services: state.services, region: state.region, currency: state.currency }),
    [state.services, state.region, state.currency]
  );

  const isCalculated = lastCalculatedHash !== null;
  const isDirty = isCalculated && lastCalculatedHash !== currentStateHash;
  const canGoToResult = isCalculated && !isDirty;

  // Las cotizaciones reales solo se solicitan cuando estamos en la pantalla de resultados
  const { status, quotes, retry } = useRegionQuotes(state.services, state.currency, step === 'result');

  const goToResults = () => {
    setDraft(null);
    setEditingId(null);
    setLastCalculatedHash(currentStateHash);
    setStep('result');
    setNavView('estimate');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToConfig = () => {
    setDraft(null);
    setEditingId(null);
    setStep('config');
    setNavView('estimate');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = (service: CloudService, editId: string | null) => {
    if (editId) {
      updateService({ ...service, id: editId });
    } else {
      addServiceWithSpec(service);
    }
    setDraft(null);
    setEditingId(null);
  };

  const handleEditStart = (service: CloudService) => {
    setDraft(service);
    setEditingId(service.id);
    goToConfig();
  };

  const handleSelectServiceKind = (kind: ServiceKind) => {
    setDraft(createServiceFromKind(kind, crypto.randomUUID()));
    setEditingId(null);
    if (step !== 'config') {
      setStep('config');
    }
    setNavView('estimate');
  };

  const handleSidebarNavigate = (view: SidebarNavView) => {
    setNavView(view);
    if (view === 'estimate') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <QuotesProvider enabled={step === 'result' && !isDirty}>
      <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 antialiased dark:bg-[#090d16] dark:text-slate-100">
        {/* Header Superior con Stepper interactivo */}
        <Header
          step={step}
          onStepChange={(newStep) => {
            if (newStep === 'config') goToConfig();
            if (newStep === 'result' && canGoToResult) {
              setStep('result');
              setNavView('estimate');
            }
          }}
          canGoToResult={canGoToResult}
        />

        {/* Contenedor Principal: Sidebar Izquierda + Contenido Central */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Moderna de Navegación y Servicios AWS */}
          <div className="hidden md:block">
            <AppSidebar
              currentView={navView}
              onNavigate={handleSidebarNavigate}
              onSelectServiceKind={handleSelectServiceKind}
              step={step}
            />
          </div>

          {/* Área de Trabajo Principal */}
          <main ref={topRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1600px] w-full">
              {/* Alerta de Configuración Modificada (Regla 41) */}
              {isDirty && step === 'config' && (
                <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                      <strong>Configuración modificada:</strong> los parámetros han cambiado respecto a la última cotización. Vuelve a calcular para actualizar los precios.
                    </span>
                  </div>
                  <Button size="sm" onClick={goToResults} className="shrink-0 bg-amber-600 text-white hover:bg-amber-500">
                    Recalcular ahora
                  </Button>
                </div>
              )}

              {/* Vista: Escenarios Guardados */}
              {navView === 'scenarios' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Mis estimaciones guardadas
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gestiona y restaura escenarios de costos almacenados en el navegador.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setNavView('estimate')}>
                      Volver a la estimación
                    </Button>
                  </div>
                  <ScenariosPanel />
                </div>
              ) : navView === 'regions' ? (
                /* Vista: Explorador Regional */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Explorador de Regiones AWS
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Visualiza los centros de datos de AWS y su distribución global.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setNavView('estimate')}>
                      Volver a la estimación
                    </Button>
                  </div>
                  <RegionMap
                    quotes={quotes}
                    status={status}
                    selectedRegion={state.region}
                    currency={state.currency}
                    onSelect={setRegion}
                    onRetry={retry}
                  />
                </div>
              ) : navView === 'compare' ? (
                /* Vista: Comparador de Precios / Ahorro */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Comparación y Sugerencias de Ahorro
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Compara el impacto de costo al mover tu infraestructura a otras regiones con precios de AWS Price List API.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setNavView('estimate')}>
                      Volver a la estimación
                    </Button>
                  </div>

                  <SavingsHint regionId={state.region} quotes={quotes} currency={state.currency} />

                  <RegionMap
                    quotes={quotes}
                    status={status}
                    selectedRegion={state.region}
                    currency={state.currency}
                    onSelect={setRegion}
                    onRetry={retry}
                  />
                </div>
              ) : (
                /* Vista Principal: Estimación (Configuración vs Resultados) */
                <>
                  {step === 'config' ? (
                    <ConfigurePanel
                      draft={draft}
                      editingId={editingId}
                      onDraftChange={setDraft}
                      onCancel={() => {
                        setDraft(null);
                        setEditingId(null);
                      }}
                      onSubmit={handleSubmit}
                      onCalculate={goToResults}
                    />
                  ) : (
                    <div className="space-y-8">
                      <EstimatePanel
                        onBack={goToConfig}
                        onAddService={goToConfig}
                        onEditStart={handleEditStart}
                        regionQuotes={quotes}
                      />

                      {/* Mapa de regiones en la vista de resultados */}
                      <section className="mt-8 space-y-3">
                        <div className="px-1">
                          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                            Explorar costos por región
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total mensual estimado de tus servicios en cada región de AWS. Para EC2 se emplean tarifas oficiales obtenidas de la AWS Price List API.
                          </p>
                        </div>
                        <RegionMap
                          quotes={quotes}
                          status={status}
                          selectedRegion={state.region}
                          currency={state.currency}
                          onSelect={setRegion}
                          onRetry={retry}
                        />
                      </section>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </QuotesProvider>
  );
}

export default function App() {
  return (
    <EstimationProvider>
      <MainLayout />
    </EstimationProvider>
  );
}