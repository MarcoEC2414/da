import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

interface PriceDimension {
  unit?: string;
  pricePerUnit?: { USD?: string };
  description?: string;
  beginRange?: string;
  endRange?: string;
}
interface Offer {
  priceDimensions?: Record<string, PriceDimension>;
}
interface Product {
  product?: { sku?: string; attributes?: Record<string, string | undefined> };
  terms?: { OnDemand?: Record<string, Offer> };
}

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
    const item = JSON.parse(jsonStr) as Product;
    const onDemand: Record<string, Offer> = item.terms?.OnDemand ?? {};
    const firstOffer = (Object.values(onDemand) as Offer[])[0];
    const dims: Record<string, PriceDimension> = firstOffer?.priceDimensions ?? {};
    const firstDim = (Object.values(dims) as PriceDimension[])[0];
    console.log(`Deployment: "${item?.product?.attributes?.deploymentOption}" -> Price: ${firstDim?.pricePerUnit?.USD} ${firstDim?.unit} (SKU: ${item?.product?.sku}) usagetype: ${item?.product?.attributes?.usagetype}`);
  }
}

testStorage().catch(console.error);
