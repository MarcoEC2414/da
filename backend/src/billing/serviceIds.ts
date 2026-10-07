export const SERVICES = {
  computeEngine: '6F81-5844-456A',
  cloudSql: '9662-B51E-5089',
  cloudStorage: '95FF-2EF5-5EA1',
} as const;

export type CatalogServiceId = (typeof SERVICES)[keyof typeof SERVICES];