import type { Region } from '../types';
import regionsJson from '../../../shared/awsRegions.json';

/**
 * Regiones de AWS (nombres oficiales; coordenadas aproximadas de la ciudad).
 * Fuente de códigos/nombres: https://docs.aws.amazon.com/general/latest/gr/ec2-service.html
 * La fuente real es shared/awsRegions.json (compartida con el backend).
 */
export const REGIONS: Region[] = regionsJson.regions as Region[];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export const DEFAULT_REGION = 'us-east-1';