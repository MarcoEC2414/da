import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

async function checkMultiAzInstance() {
  const res = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonRDS',
    FormatVersion: 'aws_v1',
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
      { Type: 'TERM_MATCH', Field: 'instanceType', Value: 'db.t3.micro' },
      { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: 'PostgreSQL' },
      { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: 'Multi-AZ' }
    ]
  }));
  for (const raw of res.PriceList || []) {
    const item = JSON.parse(String(raw));
    const desc = Object.values(item.terms?.OnDemand || {})[0]?.priceDimensions;
    const firstDim = desc ? Object.values(desc)[0] : null;
    console.log(`Multi-AZ Instance: ${item.product.attributes.instanceType} -> Price: ${firstDim?.pricePerUnit?.USD} ${firstDim?.unit} (SKU: ${item.product.sku})`);
  }
}

checkMultiAzInstance().catch(console.error);
