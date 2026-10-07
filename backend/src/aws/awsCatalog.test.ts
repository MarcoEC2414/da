import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateServiceUsd, quoteAllRegions } from './awsCatalog';
import ratesJson from '../../../shared/awsRates.json';

test('ec2 t3.micro linux us-east-1', async () => {
  const q = await estimateServiceUsd(
    { id: 's1', name: 'Amazon EC2', kind: 'ec2', spec: { instanceType: 't3.micro', os: 'linux', hoursPerMonth: 730, instanceCount: 1 } },
    'us-east-1'
  );
  assert.ok(q);
  assert.equal(q.monthly, Math.round(0.0104 * 730 * 100) / 100);
});

test('ec2 sin región conocida -> null', async () => {
  const q = await estimateServiceUsd(
    { id: 's1', name: 'Amazon EC2', kind: 'ec2', spec: { instanceType: 't3.micro', os: 'linux' } },
    'mars-1'
  );
  assert.equal(q, null);
});

test('rds multiplaza duplica la instancia y suma storage', async () => {
  const q = await estimateServiceUsd(
    { id: 's1', name: 'Amazon RDS', kind: 'rds', spec: { engine: 'mysql', instanceType: 'db.t3.micro', storageGb: 100, multiAz: true } },
    'us-east-1'
  );
  assert.ok(q);
  const instance = Math.round(0.018 * 2 * 730 * 100) / 100;
  const storage = Math.round(100 * ratesJson.rds.storagePerGbMonth * 100) / 100;
  assert.equal(q.monthly, Math.round((instance + storage) * 100) / 100);
  assert.equal(q.breakdown.length, 2);
});

test('quoteAllRegions responde para todas las regiones', async () => {
  const res = await quoteAllRegions([
    { id: 's1', name: 'Amazon S3', kind: 's3', spec: { storageClass: 'standard', storageGb: 100 } },
  ]);
  assert.equal(res.currency, 'USD');
  assert.ok(res.quotes.length > 25);
  const usEast = res.quotes.find((r) => r.regionId === 'us-east-1');
  assert.equal(usEast?.monthly, 2.3);
});

test('sns coste por millones de publicaciones', async () => {
  const q = await estimateServiceUsd(
    { id: 's1', name: 'Amazon SNS', kind: 'sns', spec: { requestsMillions: 2 } },
    'us-east-1'
  );
  assert.ok(q);
  assert.equal(q.monthly, 1);
});