import instanceTypes from '../../../shared/instanceTypes.json';
import dbSizes from '../../../shared/dbSizes.json';

export interface InstanceSpec {
  id: string;
  vCpu: number;
  memoryGb: number;
  family: string;
}

export interface DbSizeSpec {
  id: string;
  vCpu: number;
  memoryGb: number;
}

export const INSTANCE_SPECS: InstanceSpec[] = instanceTypes as InstanceSpec[];
export const DB_SIZE_SPECS: DbSizeSpec[] = dbSizes as DbSizeSpec[];

export const DB_MEMORY_GB = {
  'db-f1-micro': 0.6,
  'db-custom-2-7680': 7.5,
  'db-custom-4-15360': 15,
  'db-custom-8-30720': 30,
} as const;