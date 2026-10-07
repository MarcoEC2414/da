import { PricingClient, GetAttributeValuesCommand, GetProductsCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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
  product: { sku?: string; productFamily?: string; attributes: Record<string, string | undefined> };
  terms?: { OnDemand?: Record<string, Offer> };
}

function parseItem(raw: unknown): Product {
  return JSON.parse(String(raw)) as Product;
}

/** priceDimensions de la primera oferta OnDemand del producto. */
function firstPriceDimensions(item: Product): Record<string, PriceDimension> | undefined {
  const onDemand: Record<string, Offer> = item.terms?.OnDemand ?? {};
  const firstOffer = (Object.values(onDemand) as Offer[])[0];
  return firstOffer?.priceDimensions;
}

async function run() {
  const docsDir = path.resolve(process.cwd(), '../docs/evidencia');
  fs.mkdirSync(docsDir, { recursive: true });

  console.log('=== 1. DISCOVERING S3 ===');
  const s3StorageClasses = await client.send(new GetAttributeValuesCommand({
    ServiceCode: 'AmazonS3',
    AttributeName: 'storageClass',
    MaxResults: 20
  }));
  console.log('S3 storageClasses:', s3StorageClasses.AttributeValues?.map(v => v.Value));

  const s3Products = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonS3',
    FormatVersion: 'aws_v1',
    MaxResults: 5,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
      { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Storage' },
      { Type: 'TERM_MATCH', Field: 'storageClass', Value: 'General Purpose' } // Standard
    ]
  }));
  console.log('S3 Standard products found:', s3Products.PriceList?.length);
  if (s3Products.PriceList?.[0]) {
    const item = parseItem(s3Products.PriceList[0]);
    fs.writeFileSync(path.join(docsDir, 'aws-s3-sample.json'), JSON.stringify(item, null, 2));
    const dims = firstPriceDimensions(item);
    console.log('S3 dimensions:', Object.values(dims || {}).map((d: any) => ({
      desc: d.description,
      unit: d.unit,
      price: d.pricePerUnit?.USD,
      begin: d.beginRange,
      end: d.endRange
    })));
  }

  console.log('\n=== 2. DISCOVERING LAMBDA ===');
  const lambdaGroups = await client.send(new GetAttributeValuesCommand({
    ServiceCode: 'AWSLambda',
    AttributeName: 'group',
    MaxResults: 20
  }));
  console.log('Lambda groups:', lambdaGroups.AttributeValues?.map(v => v.Value));

  const lambdaProducts = await client.send(new GetProductsCommand({
    ServiceCode: 'AWSLambda',
    FormatVersion: 'aws_v1',
    MaxResults: 5,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
    ]
  }));
  console.log('Lambda products found in us-east-1:', lambdaProducts.PriceList?.length);
  for (const raw of lambdaProducts.PriceList || []) {
    const item = parseItem(raw);
    const dims = firstPriceDimensions(item);
    console.log('Lambda item group:', item.product.attributes.group, 'usagetype:', item.product.attributes.usagetype);
    console.log(' dims:', Object.values(dims || {}).map((d: any) => ({
      desc: d.description,
      unit: d.unit,
      price: d.pricePerUnit?.USD,
      begin: d.beginRange,
      end: d.endRange
    })));
    if (!fs.existsSync(path.join(docsDir, 'aws-lambda-sample.json'))) {
      fs.writeFileSync(path.join(docsDir, 'aws-lambda-sample.json'), JSON.stringify(item, null, 2));
    }
  }

  console.log('\n=== 3. DISCOVERING DYNAMODB ===');
  const ddbGroups = await client.send(new GetAttributeValuesCommand({
    ServiceCode: 'AmazonDynamoDB',
    AttributeName: 'group',
    MaxResults: 20
  }));
  console.log('DynamoDB groups:', ddbGroups.AttributeValues?.map(v => v.Value));

  const ddbProducts = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonDynamoDB',
    FormatVersion: 'aws_v1',
    MaxResults: 10,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
    ]
  }));
  console.log('DynamoDB products found in us-east-1:', ddbProducts.PriceList?.length);
  for (const raw of ddbProducts.PriceList || []) {
    const item = parseItem(raw);
    console.log('DDB group:', item.product.attributes.group, 'productFamily:', item.product.productFamily, 'usagetype:', item.product.attributes.usagetype);
    if (!fs.existsSync(path.join(docsDir, 'aws-dynamodb-sample.json'))) {
      fs.writeFileSync(path.join(docsDir, 'aws-dynamodb-sample.json'), JSON.stringify(item, null, 2));
    }
  }

  console.log('\n=== 4. DISCOVERING SNS ===');
  const snsProducts = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonSNS',
    FormatVersion: 'aws_v1',
    MaxResults: 10,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: 'US East (N. Virginia)' },
    ]
  }));
  console.log('SNS products found in us-east-1:', snsProducts.PriceList?.length);
  for (const raw of snsProducts.PriceList || []) {
    const item = parseItem(raw);
    const dims = firstPriceDimensions(item);
    console.log('SNS group:', item.product.attributes.group, 'usagetype:', item.product.attributes.usagetype);
    console.log(' dims:', Object.values(dims || {}).map((d: any) => ({
      desc: d.description,
      unit: d.unit,
      price: d.pricePerUnit?.USD
    })));
    if (!fs.existsSync(path.join(docsDir, 'aws-sns-sample.json'))) {
      fs.writeFileSync(path.join(docsDir, 'aws-sns-sample.json'), JSON.stringify(item, null, 2));
    }
  }

  console.log('\n=== 5. DISCOVERING CLOUDFRONT ===');
  const cfProducts = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonCloudFront',
    FormatVersion: 'aws_v1',
    MaxResults: 10,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Data Transfer' }
    ]
  }));
  console.log('CloudFront Data Transfer products found:', cfProducts.PriceList?.length);
  for (const raw of cfProducts.PriceList || []) {
    const item = parseItem(raw);
    const dims = firstPriceDimensions(item);
    console.log('CF loc:', item.product.attributes.location, 'transferType:', item.product.attributes.transferType, 'usagetype:', item.product.attributes.usagetype);
    console.log(' dims count:', Object.keys(dims || {}).length);
    if (!fs.existsSync(path.join(docsDir, 'aws-cloudfront-sample.json'))) {
      fs.writeFileSync(path.join(docsDir, 'aws-cloudfront-sample.json'), JSON.stringify(item, null, 2));
    }
  }

  console.log('\n=== 6. DISCOVERING ROUTE 53 ===');
  const r53Products = await client.send(new GetProductsCommand({
    ServiceCode: 'AmazonRoute53',
    FormatVersion: 'aws_v1',
    MaxResults: 10
  }));
  console.log('Route53 products found:', r53Products.PriceList?.length);
  for (const raw of r53Products.PriceList || []) {
    const item = parseItem(raw);
    const dims = firstPriceDimensions(item);
    console.log('R53 family:', item.product.productFamily, 'usagetype:', item.product.attributes.usagetype);
    console.log(' dims:', Object.values(dims || {}).map((d: any) => ({
      desc: d.description,
      unit: d.unit,
      price: d.pricePerUnit?.USD,
      begin: d.beginRange,
      end: d.endRange
    })));
    if (!fs.existsSync(path.join(docsDir, 'aws-route53-sample.json'))) {
      fs.writeFileSync(path.join(docsDir, 'aws-route53-sample.json'), JSON.stringify(item, null, 2));
    }
  }

  console.log('All discovery queries completed successfully!');
}

run().catch(console.error);
