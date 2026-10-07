import type { AwsServiceDefinition, ServiceSpec } from '../../types';
import { Select } from '../ui/Select';
import { NumberInput } from '../ui/NumberInput';
import { Toggle } from '../ui/Toggle';

export function ServiceForm({
  definition,
  value,
  onChange,
}: {
  definition: AwsServiceDefinition;
  value: ServiceSpec;
  onChange: (spec: ServiceSpec) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {definition.fields.map((f) => {
        const current = value[f.key];

        if (f.kind === 'select') {
          return (
            <Select
              key={f.key}
              label={f.label}
              value={typeof current === 'string' ? current : ''}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            >
              {f.options?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          );
        }

        if (f.kind === 'number') {
          return (
            <NumberInput
              key={f.key}
              label={f.label}
              suffix={f.unit}
              min={f.min}
              max={f.max}
              step={f.step}
              value={typeof current === 'number' ? current : 0}
              onChange={(e) => onChange({ ...value, [f.key]: Number(e.target.value) })}
            />
          );
        }

        return (
          <div key={f.key} className="flex items-end">
            <Toggle
              label={f.label}
              checked={current === true}
              onChange={(checked) => onChange({ ...value, [f.key]: checked })}
            />
          </div>
        );
      })}
    </div>
  );
}