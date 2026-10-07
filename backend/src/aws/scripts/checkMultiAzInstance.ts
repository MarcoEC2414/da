import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

interface PriceDimension {
  unit?: string;
  pricePerUnit?: { USD?: string };
  description?: string;
}
interface Offer {
  priceDimensions?: Record<string, PriceDimension>;
}
interface Product {
  product?: { sku?: string; attributes?: Record<string, string | undefined> };
  terms?: { OnDemand?: Record<string, Offer> };
}

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
    const item = JSON.parse(String(raw)) as Product;
    const onDemand: Record<string, Offer> = item.terms?.OnDemand ?? {};
    const firstOffer = (Object.values(onDemand) as Offer[])[0];
    const dims: Record<string, PriceDimension> = firstOffer?.priceDimensions ?? {};
    const firstDim = (Object.values(dims) as PriceDimension[])[0];
    console.log(`Multi-AZ Instance: ${item.product?.attributes?.instanceType} -> Price: ${firstDim?.pricePerUnit?.USD} ${firstDim?.unit} (SKU: ${item.product?.sku})`);
  }
}

checkMultiAzInstance().catch(console.error);
