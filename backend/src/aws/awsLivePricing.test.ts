import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Ec2PricingError,
  REGION_CODES,
  asciiLocation,
  createEc2PriceStore,
  ec2CacheKey,
  ec2LocationOf,
  parseEc2ProductPayload,
  regionToLocation,
  toEc2MonthlyEstimate,
} from './awsLivePricing';

test('parse t3.micro Linux on-demand por hora (fixture real)', () => {
  const raw = JSON.stringify({
    product: { sku: 'CRAJUW7BTXFMT2UJ', attributes: { instanceType: 't3.micro', operatingSystem: 'Linux' } },
    terms: {
      OnDemand: {
        offer1: {
          priceDimensions: {
            dim1: { unit: 'Hrs', pricePerUnit: { USD: '0.0104000000' } },
          },
        },
      },
    },
  });
  const parsed = parseEc2ProductPayload(raw);
  assert.deepEqual(parsed, { pricePerHour: 0.0104, sku: 'CRAJUW7BTXFMT2UJ' });
});

test('parse SUSE (misma forma, sin dependencias del atributo OS)', () => {
  const raw = JSON.stringify({
    product: { sku: 'BC2SFDXEPX53FCV2' },
    terms: {
      OnDemand: {
        offer1: {
          priceDimensions: {
            dim1: { unit: 'Hrs', pricePerUnit: { USD: '0.0104000000' } },
          },
        },
      },
    },
  });
  const parsed = parseEc2ProductPayload(raw);
  assert.equal(parsed?.pricePerHour, 0.0104);
  assert.equal(parsed?.sku, 'BC2SFDXEPX53FCV2');
});

test('parse acepta el objeto ya decodificado (SDK v3.1147 devuelve objetos)', () => {
  const parsed = parseEc2ProductPayload({
    product: { sku: 'CRAJUW7BTXFMT2UJ' },
    terms: {
      OnDemand: {
        offer1: {
          priceDimensions: {
            dim1: { unit: 'Hrs', pricePerUnit: { USD: '0.0104000000' } },
          },
        },
      },
    },
  });
  assert.deepEqual(parsed, { pricePerHour: 0.0104, sku: 'CRAJUW7BTXFMT2UJ' });
});

test('parse acepta un String en caja (new String) con el JSON dentro', () => {
  const boxed = new String(JSON.stringify({
    product: { sku: 'CRAJUW7BTXFMT2UJ' },
    terms: {
      OnDemand: {
        offer1: {
          priceDimensions: {
            dim1: { unit: 'Hrs', pricePerUnit: { USD: '0.0104000000' } },
          },
        },
      },
    },
  }));
  const parsed = parseEc2ProductPayload(boxed as unknown);
  assert.deepEqual(parsed, { pricePerHour: 0.0104, sku: 'CRAJUW7BTXFMT2UJ' });
});

test('parse devuelve null sin OnDemand o sin precio USD', () => {
  assert.equal(parseEc2ProductPayload('no-json'), null);
  assert.equal(parseEc2ProductPayload(JSON.stringify({ product: { sku: 'X' }, terms: {} })), null);
  assert.equal(
    parseEc2ProductPayload(
      JSON.stringify({
        product: { sku: 'X' },
        terms: { OnDemand: { offer1: { priceDimensions: { d1: { unit: 'Hrs' } } } } },
      })
    ),
    null
  );
});

test('regiones: todas tienen location de Pricing API (override si el display difiere)', () => {
  assert.equal(regionToLocation('us-east-1'), 'US East (N. Virginia)');
  assert.equal(regionToLocation('mars-1'), null);
  for (const code of REGION_CODES) {
    assert.ok(ec2LocationOf(code), `faltó location para ${code}`);
  }
  assert.equal(ec2LocationOf('eu-west-1'), 'EU (Ireland)');
  assert.equal(ec2LocationOf('eu-central-1'), 'EU (Frankfurt)');
  assert.equal(ec2LocationOf('eu-central-2'), 'Europe (Zurich)');
  assert.equal(ec2LocationOf('eu-north-1'), 'EU (Stockholm)');
  assert.equal(ec2LocationOf('eu-south-1'), 'EU (Milan)');
});

test('location ASCII para GetProducts: quita acentos y aplica overrides', () => {
  assert.equal(ec2LocationOf('sa-east-1'), 'South America (Sao Paulo)');
  assert.equal(ec2LocationOf('us-east-1'), 'US East (N. Virginia)');
  assert.equal(ec2LocationOf('mars-1'), null);
  assert.equal(asciiLocation('São Paulo'), 'Sao Paulo');
  assert.equal(asciiLocation('US East (N. Virginia)'), 'US East (N. Virginia)');
});

test('caché: MISS inicial, HIT posterior, sin repetir la consulta real', async () => {
  let realCalls = 0;
  const store = createEc2PriceStore({
    fetch: async ({ location, instanceType, os }) => {
      realCalls += 1;
      assert.equal(location, 'US East (N. Virginia)');
      assert.equal(instanceType, 't3.micro');
      assert.equal(os, 'Linux');
      return { pricePerHour: 0.0104, sku: 'S1', retrievedAt: '2026-10-07T12:00:00.000Z' };
    },
    onLog: () => {},
  });

  const first = await store.lookup('us-east-1', 't3.micro', 'Linux');
  assert.equal(first.status, 'ok');
  if (first.status === 'ok') assert.equal(first.price.cacheStatus, 'MISS');

  const second = await store.lookup('us-east-1', 't3.micro', 'Linux');
  assert.equal(second.status, 'ok');
  if (second.status === 'ok') {
    assert.equal(second.price.cacheStatus, 'HIT');
    assert.equal(second.price.retrievedAt, '2026-10-07T12:00:00.000Z');
  }

  assert.equal(realCalls, 1);
  assert.deepEqual(store.stats(), { cacheHits: 1, realRequests: 1 });
});

test('caché: expira con el TTL y vuelve a consultar', async () => {
  let now = 1_000_000;
  let realCalls = 0;
  const store = createEc2PriceStore({
    ttlMs: 1000,
    now: () => now,
    fetch: async () => {
      realCalls += 1;
      return { pricePerHour: 0.1, sku: 'S', retrievedAt: '2026-10-07T00:00:00.000Z' };
    },
    onLog: () => {},
  });

  await store.lookup('us-east-1', 't3.micro', 'Linux');
  now = 2_000_001;
  const expired = await store.lookup('us-east-1', 't3.micro', 'Linux');
  assert.equal(expired.status, 'ok');
  if (expired.status === 'ok') assert.equal(expired.price.cacheStatus, 'MISS');
  assert.equal(realCalls, 2);
});

test('combinación sin producto -> not-found (Configuración no disponible)', async () => {
  const store = createEc2PriceStore({
    fetch: async () => null,
    onLog: () => {},
  });
  const result = await store.lookup('sa-east-1', 't3.micro', 'SUSE');
  assert.equal(result.status, 'not-found');
});

test('región sin location -> not-found sin consultar AWS', async () => {
  const store = createEc2PriceStore({
    fetch: async () => {
      throw new Error('no debe llamarse');
    },
    onLog: () => {},
  });
  const result = await store.lookup('mars-1', 't3.micro', 'Linux');
  assert.equal(result.status, 'not-found');
});

test('error del SDK -> AWS_UNAVAILABLE 503', async () => {
  const store = createEc2PriceStore({
    fetch: async () => {
      throw new Error('ThrottlingException');
    },
    onLog: () => {},
  });
  await assert.rejects(
    store.lookup('us-east-1', 't3.micro', 'Linux'),
    (err: unknown) => err instanceof Ec2PricingError && err.statusCode === 503 && err.kind === 'AWS_UNAVAILABLE'
  );
});

test('error tipado Ec2PricingError se propaga tal cual', async () => {
  const store = createEc2PriceStore({
    fetch: async () => {
      throw new Ec2PricingError('AWS_UNAVAILABLE', 503, 'Sin credenciales');
    },
    onLog: () => {},
  });
  await assert.rejects(store.lookup('us-east-1', 't3.micro', 'Linux'), /Sin credenciales/);
});

test('clave de caché por región/instancia/SO', () => {
  assert.equal(ec2CacheKey('us-east-1', 't3.micro', 'Linux'), 'ec2:us-east-1:t3.micro:Linux');
  assert.notEqual(ec2CacheKey('us-east-1', 't3.micro', 'Linux'), ec2CacheKey('us-east-1', 't3.micro', 'SUSE'));
});

test('estimación mensual = precio por hora * horas * cantidad', () => {
  assert.equal(toEc2MonthlyEstimate(0.0104, 730, 1), 7.592);
  assert.equal(toEc2MonthlyEstimate(0.0104, 730, 2), 15.184);
});