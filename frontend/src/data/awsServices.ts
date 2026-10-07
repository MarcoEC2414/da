import type { AwsServiceDefinition, CloudService, ServiceKind, ServiceSpec } from '../types';
import rates from '../../../shared/awsRates.json';

export const SERVICE_KINDS: ServiceKind[] = ['ec2', 'rds', 's3', 'lambda', 'dynamodb', 'sns', 'cloudfront', 'route53'];

/** Etiqueta corta para las insignias de la tabla. */
export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  ec2: 'Cómputo',
  rds: 'Base de datos',
  s3: 'Almacenamiento',
  lambda: 'Funciones',
  dynamodb: 'NoSQL',
  sns: 'Notificaciones',
  cloudfront: 'CDN',
  route53: 'DNS',
};

const KIND_STYLES: Record<ServiceKind, string> = {
  ec2: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  rds: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  s3: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  lambda: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  dynamodb: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  sns: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  cloudfront: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  route53: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
};

export function serviceKindStyle(kind: ServiceKind): string {
  return KIND_STYLES[kind];
}

/**
 * Valor de `operatingSystem` que espera la AWS Price List API a partir del
 * selector visual del formulario EC2 (linux | windows | suse).
 */
export function ec2OperatingSystem(os: unknown): 'Linux' | 'Windows' | 'SUSE' {
  switch (os) {
    case 'windows':
      return 'Windows';
    case 'suse':
      return 'SUSE';
    default:
      return 'Linux';
  }
}

const ec2Types = rates.ec2.types.map((t) => ({
  id: t.id,
  label: `${t.label} · ${t.vcpu} vCPU · ${t.memoryGb} GB`,
}));

const rdsTypes = rates.rds.types.map((t) => ({
  id: t.id,
  label: `${t.label} · ${t.vcpu} vCPU · ${t.memoryGb} GB`,
}));

const s3Classes = rates.s3.classes.map((c) => ({ id: c.id, label: c.label }));

const OS_OPTIONS = [
  { id: 'linux', label: 'Linux' },
  { id: 'windows', label: 'Windows Server' },
  { id: 'suse', label: 'SUSE Linux Enterprise' },
];

/** Definición de los 8 servicios AWS simulados (tarifas de referencia en awsRates.json). */
export const SERVICE_DEFINITIONS: AwsServiceDefinition[] = [
  {
    kind: 'ec2',
    name: 'Amazon EC2',
    provider: 'Cómputo (instancias)',
    description: 'Máquinas virtuales por hora según tipo y sistema operativo.',
    fields: [
      { key: 'instanceType', label: 'Tipo de instancia', kind: 'select', options: ec2Types, defaultValue: 't3.micro' },
      { key: 'os', label: 'Sistema operativo', kind: 'select', options: OS_OPTIONS, defaultValue: 'linux' },
      { key: 'hoursPerMonth', label: 'Horas de uso al mes', kind: 'number', unit: 'h/mes', min: 1, max: 744, step: 1, defaultValue: 730 },
      { key: 'instanceCount', label: 'Cantidad de instancias', kind: 'number', unit: 'uds.', min: 1, max: 1000, step: 1, defaultValue: 1 },
    ],
  },
  {
    kind: 'rds',
    name: 'Amazon RDS',
    provider: 'Base de datos gestionada',
    description: 'MySQL o PostgreSQL con instancia, almacenamiento gp3 y opción Multi-AZ.',
    fields: [
      { key: 'engine', label: 'Motor', kind: 'select', options: [{ id: 'mysql', label: 'MySQL' }, { id: 'postgresql', label: 'PostgreSQL' }], defaultValue: 'postgresql' },
      { key: 'instanceType', label: 'Tipo de instancia', kind: 'select', options: rdsTypes, defaultValue: 'db.t3.micro' },
      { key: 'storageGb', label: 'Almacenamiento', kind: 'number', unit: 'GB', min: 10, max: 64000, step: 10, defaultValue: 100 },
      { key: 'multiAz', label: 'Multirregional (Multi-AZ)', kind: 'toggle', defaultValue: false },
    ],
  },
  {
    kind: 's3',
    name: 'Amazon S3',
    provider: 'Almacenamiento de objetos',
    description: 'Almacenamiento por GB y clase de acceso.',
    fields: [
      { key: 'storageClass', label: 'Clase de almacenamiento', kind: 'select', options: s3Classes, defaultValue: 'standard' },
      { key: 'storageGb', label: 'Almacenamiento', kind: 'number', unit: 'GB', min: 0, max: 1000000, step: 10, defaultValue: 1000 },
    ],
  },
  {
    kind: 'lambda',
    name: 'AWS Lambda',
    provider: 'Funciones sin servidor',
    description: 'Cobro por invocaciones y por GB-segundo de cómputo.',
    fields: [
      { key: 'requestsMillions', label: 'Invocaciones', kind: 'number', unit: 'M/mes', min: 0, max: 100000, step: 1, defaultValue: 1 },
      { key: 'gbSeconds', label: 'Cómputo', kind: 'number', unit: 'GB-seg/mes', min: 0, max: 100000000, step: 10000, defaultValue: 0 },
    ],
  },
  {
    kind: 'dynamodb',
    name: 'Amazon DynamoDB',
    provider: 'Base de datos NoSQL',
    description: 'Almacenamiento y capacidad provisionada (RCU/WCU).',
    fields: [
      { key: 'storageGb', label: 'Almacenamiento', kind: 'number', unit: 'GB', min: 0, max: 100000, step: 1, defaultValue: 100 },
      { key: 'readCapacityUnits', label: 'Capacidad de lectura', kind: 'number', unit: 'RCU', min: 0, max: 100000, step: 1, defaultValue: 5 },
      { key: 'writeCapacityUnits', label: 'Capacidad de escritura', kind: 'number', unit: 'WCU', min: 0, max: 100000, step: 1, defaultValue: 5 },
    ],
  },
  {
    kind: 'sns',
    name: 'Amazon SNS',
    provider: 'Notificaciones pub/sub',
    description: 'Cobro por millones de publicaciones.',
    fields: [
      { key: 'requestsMillions', label: 'Publicaciones', kind: 'number', unit: 'M/mes', min: 0, max: 100000, step: 1, defaultValue: 1 },
    ],
  },
  {
    kind: 'cloudfront',
    name: 'Amazon CloudFront',
    provider: 'CDN (Edge)',
    description: 'Cobro por GB de datos de salida hacia internet.',
    fields: [
      { key: 'dataOutGb', label: 'Datos de salida', kind: 'number', unit: 'GB/mes', min: 0, max: 1000000, step: 10, defaultValue: 100 },
    ],
  },
  {
    kind: 'route53',
    name: 'Amazon Route 53',
    provider: 'DNS gestionado',
    description: 'Zonas hospedadas y millones de consultas DNS.',
    fields: [
      { key: 'zones', label: 'Zonas hospedadas', kind: 'number', unit: 'zonas', min: 0, max: 1000, step: 1, defaultValue: 1 },
      { key: 'queriesMillions', label: 'Consultas DNS', kind: 'number', unit: 'M/mes', min: 0, max: 100000, step: 1, defaultValue: 0 },
    ],
  },
];

function defaultFor(def: AwsServiceDefinition): ServiceSpec {
  const spec: ServiceSpec = {};
  for (const f of def.fields) {
    spec[f.key] = f.defaultValue ?? (f.kind === 'toggle' ? false : f.kind === 'number' ? 0 : '');
  }
  return spec;
}

export function getServiceDefinition(kind: ServiceKind): AwsServiceDefinition {
  const def = SERVICE_DEFINITIONS.find((d) => d.kind === kind);
  if (!def) throw new Error(`Servicio AWS desconocido: ${kind}`);
  return def;
}

export function createServiceFromKind(kind: ServiceKind, id: string): CloudService {
  const def = getServiceDefinition(kind);
  return { id, kind, name: '', spec: defaultFor(def) };
}

export function optionLabel(defField?: { options?: { id: string; label: string }[] }, value?: unknown): string {
  if (typeof value !== 'string') return '';
  return defField?.options?.find((o) => o.id === value)?.label ?? value;
}

/** Resumen breve de configuración para la tabla de resultados. */
export function configSummary(service: CloudService): string {
  const def = getServiceDefinition(service.kind);
  const parts = def.fields
    .map((f) => {
      const value = service.spec[f.key];
      if (f.kind === 'select') return optionLabel(f, value);
      if (f.kind === 'number') return value === 0 && f.step === undefined ? '' : `${value} ${f.unit ?? ''}`.trim();
      if (f.kind === 'toggle') return value === true ? f.label : '';
      return '';
    })
    .filter(Boolean);
  return parts.join(' · ') || 'Configuración por defecto';
}

export function quantityLabel(service: CloudService): string {
  switch (service.kind) {
    case 'ec2':
      return `×${service.spec.instanceCount ?? 1}`;
    case 'rds':
      return '1';
    case 's3':
      return `${service.spec.storageGb ?? 0} GB`;
    case 'dynamodb':
      return `${service.spec.storageGb ?? 0} GB`;
    case 'lambda':
      return `${service.spec.requestsMillions ?? 0} M`;
    case 'sns':
      return `${service.spec.requestsMillions ?? 0} M`;
    case 'cloudfront':
      return `${service.spec.dataOutGb ?? 0} GB`;
    case 'route53':
      return `${service.spec.zones ?? 0}`;
  }
}