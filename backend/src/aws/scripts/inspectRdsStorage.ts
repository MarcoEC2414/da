import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

async function testStorage() {
  const res = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonRDS',
    FormatVersion: 'aws_v1',
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
      { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Database Storage' },
      { Type: 'TERM_MATCH', Field: 'volumeType', Value: 'General Purpose-GP3' },
      { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: 'PostgreSQL' },
    ]
  }));
  for (const raw of res.PriceList || []) {
    const jsonStr = String(raw);
    const item = JSON.parse(jsonStr);
    const desc = Object.values(item.terms?.OnDemand || {})[0]?.priceDimensions;
    const firstDim = desc ? Object.values(desc)[0] : null;
    console.log(`Deployment: "${item?.product?.attributes?.deploymentOption}" -> Price: ${firstDim?.pricePerUnit?.USD} ${firstDim?.unit} (SKU: ${item?.product?.sku}) usagetype: ${item?.product?.attributes?.usagetype}`);
  }
}

testStorage().catch(console.error);
