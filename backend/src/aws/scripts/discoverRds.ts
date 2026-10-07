import { PricingClient, GetAttributeValuesCommand, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

async function run() {
  console.log('--- Discovering Amazon RDS attributes ---');
  
  // 1. Get sample attribute values for important RDS attributes
  const attrsToQuery = ['productFamily', 'instanceType', 'databaseEngine', 'deploymentOption', 'volumeType'];
  for (const attr of attrsToQuery) {
    try {
      const res = await client.send(new GetAttributeValuesCommand({
        ServiceCode: 'AmazonRDS',
        AttributeName: attr,
        MaxResults: 10
      }));
      console.log(`Attribute "${attr}" sample values:`, res.AttributeValues?.map(v => v.Value));
    } catch (e) {
      console.error(`Error querying attribute ${attr}:`, (e as Error).message);
    }
  }

  // 2. Query GetProducts for a Database Instance in US East (N. Virginia)
  // Let's test db.t3.micro, PostgreSQL, Single-AZ
  console.log('\nQuerying Database Instance for db.t3.micro (PostgreSQL, Single-AZ)...');
  const instanceRes = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonRDS',
    FormatVersion: 'aws_v1',
    MaxResults: 5,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
      { Type: 'TERM_MATCH', Field: 'instanceType', Value: 'db.t3.micro' },
      { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: 'PostgreSQL' },
      { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: 'Single-AZ' }
    ]
  }));

  console.log(`Instance products returned: ${instanceRes.PriceList?.length}`);
  let sampleInstance: unknown = null;
  if (instanceRes.PriceList && instanceRes.PriceList.length > 0) {
    sampleInstance = typeof instanceRes.PriceList[0] === 'string'
      ? JSON.parse(instanceRes.PriceList[0] as string)
      : instanceRes.PriceList[0];
  }

  // 3. Query GetProducts for Database Storage (General Purpose gp3)
  console.log('\nQuerying Database Storage for gp3 in US East (N. Virginia)...');
  const storageRes = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonRDS',
    FormatVersion: 'aws_v1',
    MaxResults: 5,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
      { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Database Storage' },
      { Type: 'TERM_MATCH', Field: 'volumeType', Value: 'General Purpose-GP3' }
    ]
  }));

  console.log(`Storage products returned: ${storageRes.PriceList?.length}`);
  let sampleStorage: unknown = null;
  if (storageRes.PriceList && storageRes.PriceList.length > 0) {
    sampleStorage = typeof storageRes.PriceList[0] === 'string'
      ? JSON.parse(storageRes.PriceList[0] as string)
      : storageRes.PriceList[0];
  }

  // Save evidence sanitizada
  const docsDir = path.resolve(process.cwd(), '../docs/evidencia');
  fs.mkdirSync(docsDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(docsDir, 'aws-rds-instance-sample.json'),
    JSON.stringify(sampleInstance, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(docsDir, 'aws-rds-storage-sample.json'),
    JSON.stringify(sampleStorage, null, 2),
    'utf-8'
  );

  console.log('Evidencia guardada exitosamente en docs/evidencia/');
}

run().catch(console.error);
