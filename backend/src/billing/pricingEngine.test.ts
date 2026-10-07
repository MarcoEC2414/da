import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { estimateServiceUsd } from './pricingEngine';
import type { CatalogSku } from './normalize';

const sku = (
  id: string,
  description: string,
  serviceRegions: string[],
  price: number,
  unit = 'h',
  resourceFamily = 'Compute',
  resourceGroup = ''
): CatalogSku => ({
  skuId: id,
  serviceId: 'test',
  resourceFamily,
  resourceGroup,
  description,
  serviceRegions,
  unit,
  unitPriceUsd: price,
});

const computeFixture: CatalogSku[] = [
  sku('CE-E2-CORE-US', 'E2 Instance Core running in Iowa', ['us-central1'], 0.025),
  sku('CE-E2-RAM-US', 'E2 Instance Ram running in Iowa', ['us-central1'], 0.003125),
  sku('CE-E2-CORE-EU', 'E2 Instance Core running in Frankfurt', ['europe-west1'], 0.026),
  sku('CE-E2-RAM-EU', 'E2 Instance Ram running in Frankfurt', ['europe-west1'], 0.00326),
  sku('CE-N2-CORE-US', 'N2 Instance Core running in Iowa', ['us-central1'], 0.0316),
  sku('CE-N2-RAM-US', 'N2 Instance Ram running in Iowa', ['us-central1'], 0.0044),
  sku('CE-PREEMPTIBLE', 'E2 Instance Core running in Iowa, Preemptible', ['us-central1'], 0.007),
];

const dbFixture: CatalogSku[] = [
  sku('SQL-MYSQL-2-ZONAL', 'Cloud SQL for MySQL: 2 vCPU, 7.5 GB, Zonal', ['us-central1'], 0.1135, 'h', 'Database'),
  sku('SQL-MYSQL-2-HA', 'Cloud SQL for MySQL: 2 vCPU, 7.5 GB, High Availability (2 units)', ['us-central1'], 0.227, 'h', 'Database'),
  sku('SQL-MYSQL-F1', 'Cloud SQL for MySQL: f1-micro, Zonal', ['us-central1'], 0.01597, 'h', 'Database'),
  sku('SQL-MYSQL-F1-HA', 'Cloud SQL for MySQL: f1-micro, High Availability (2 units)', ['us-central1'], 0.032, 'h', 'Database'),
  sku('SQL-PG-4', 'Cloud SQL for PostgreSQL: 4 vCPU, 15 GB, Zonal', ['us-central1'], 0.227, 'h', 'Database'),
  sku('SQL-PG-STORE', 'Cloud SQL for PostgreSQL: Component Storage, SSD, Zonal', ['us-central1'], 0.17, 'gibyte', 'Database'),
  sku('SQL-MYSQL-STORE', 'Cloud SQL for MySQL: Component Storage, SSD, Zonal', ['us-central1'], 0.17, 'gibyte', 'Database'),
  sku('SQL-MYSQL-STORE-HDD', 'Cloud SQL for MySQL: Component Storage, HDD, Zonal', ['us-central1'], 0.04, 'gibyte', 'Database'),
];

const storageFixture: CatalogSku[] = [
  sku('GCS-STD-US', 'Standard Storage US Regional', ['us'], 0.02, 'gibyte', 'Storage'),
  sku('GCS-NEARLINE-US', 'Nearline Storage US Regional', ['us'], 0.01, 'gibyte', 'Storage'),
  sku('GCS-STD-EU', 'Standard Storage EU Regional', ['europe'], 0.023, 'gibyte', 'Storage'),
];

const catalog = { compute: computeFixture, database: dbFixture, storage: storageFixture };

describe('estimateServiceUsd - Compute Engine', () => {
  test('e2-standard-2 en us-central1 (familia e2)', () => {
    const quote = estimateServiceUsd(
      'compute',
      { instanceType: 'e2-standard-2', os: 'linux', hoursPerMonth: 730, instanceCount: 1 },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.hourly, 0.08); // 0.05 core + 0.025 ram
    assert.equal(quote.monthly, 54.75);
  });

  test('windows se cotiza igual que linux (sin multiplicadores inventados)', () => {
    const quote = estimateServiceUsd(
      'compute',
      { instanceType: 'e2-standard-2', os: 'windows', hoursPerMonth: 730, instanceCount: 1 },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.hourly, 0.08);
  });

  test('familia n2 tiene su propia tarifa', () => {
    const quote = estimateServiceUsd(
      'compute',
      { instanceType: 'n2-standard-4', os: 'linux', hoursPerMonth: 730, instanceCount: 1 },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    // 0.0316*4 + 0.0044*16 = 0.1264 + 0.0704 = 0.1968
    assert.equal(quote.hourly, 0.2);
  });

  test('región europea cae al precio europeo', () => {
    const quote = estimateServiceUsd(
      'compute',
      { instanceType: 'e2-standard-2', os: 'linux', hoursPerMonth: 730, instanceCount: 1 },
      'europe-west1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.hourly, 0.08); // 0.026*2 + 0.00326*8 = 0.052 + 0.02608 = 0.07808 -> 0.08
  });

  test('c2 ausente cae al fallback e2 en la misma región', () => {
    const quote = estimateServiceUsd(
      'compute',
      { instanceType: 'c2-standard-4', os: 'linux', hoursPerMonth: 730, instanceCount: 1 },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.hourly, 0.15); // 0.025*4 + 0.003125*16
  });
});

describe('estimateServiceUsd - Cloud SQL', () => {
  test('mysql custom-2-7680 zonal + storage SSD en us-central1', () => {
    const quote = estimateServiceUsd(
      'database',
      { engine: 'mysql', instanceSize: 'db-custom-2-7680', storageGb: 10, highAvailability: false },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.monthly, 84.56); // instancia 82.855 -> 82.86 + storage 1.7
    assert.deepEqual(quote.breakdown.map((b) => b.label), [
      'Instancia mysql (db-custom-2-7680)',
      'Storage SSD 10 GB',
    ]);
  });

  test('ha: toma la SKU de alta disponibilidad (el doble)', () => {
    const quote = estimateServiceUsd(
      'database',
      { engine: 'mysql', instanceSize: 'db-custom-2-7680', storageGb: 10, highAvailability: true },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.ok(quote.monthly > 160);
  });

  test('f1-micro por token exacto', () => {
    const quote = estimateServiceUsd(
      'database',
      { engine: 'mysql', instanceSize: 'db-f1-micro', storageGb: 5, highAvailability: false },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.monthly, 12.51); // 0.01597*730=11.658 -> 11.66 + 0.85
  });

  test('postgresql con instancia más grande', () => {
    const quote = estimateServiceUsd(
      'database',
      { engine: 'postgresql', instanceSize: 'db-custom-4-15360', storageGb: 10, highAvailability: false },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.breakdown[0].label, 'Instancia postgresql (db-custom-4-15360)');
  });
});

describe('estimateServiceUsd - Cloud Storage', () => {
  test('standard en us-central1 (multirregión us)', () => {
    const quote = estimateServiceUsd(
      'storage',
      { storageGb: 100, storageClass: 'standard' },
      'us-central1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.monthly, 2);
  });

  test('europe-west1 usa tarifa europea', () => {
    const quote = estimateServiceUsd(
      'storage',
      { storageGb: 100, storageClass: 'standard' },
      'europe-west1',
      catalog
    );
    assert.ok(quote);
    assert.equal(quote.monthly, 2.3);
  });

  test('región sin datos para la clase -> null', () => {
    const quote = estimateServiceUsd(
      'storage',
      { storageGb: 10, storageClass: 'coldline' },
      'us-central1',
      catalog
    );
    assert.equal(quote, null);
  });
});

describe('regiones sin precio', () => {
  test('asia-southeast1 no tiene nada en el fixture -> null en compute y storage', () => {
    const compute = estimateServiceUsd(
      'compute',
      { instanceType: 'e2-standard-2', os: 'linux', hoursPerMonth: 730, instanceCount: 1 },
      'asia-southeast1',
      catalog
    );
    const storage = estimateServiceUsd('storage', { storageGb: 10, storageClass: 'standard' }, 'asia-southeast1', catalog);
    assert.equal(compute, null);
    assert.equal(storage, null);
  });
});