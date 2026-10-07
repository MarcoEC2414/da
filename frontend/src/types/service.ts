export type ServiceKind = 'ec2' | 'rds' | 's3' | 'lambda' | 'dynamodb' | 'sns' | 'cloudfront' | 'route53';

export type SpecValue = string | number | boolean;
export type ServiceSpec = Record<string, SpecValue>;

export interface AwsSelectOption {
  id: string;
  label: string;
}

export interface AwsFieldDef {
  key: string;
  label: string;
  kind: 'select' | 'number' | 'toggle';
  options?: AwsSelectOption[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: SpecValue;
}

export interface AwsServiceDefinition {
  kind: ServiceKind;
  name: string;
  provider: string;
  description: string;
  fields: AwsFieldDef[];
}

export interface BaseService {
  id: string;
  name: string;
}

export type CloudService = BaseService & {
  kind: ServiceKind;
  spec: ServiceSpec;
};