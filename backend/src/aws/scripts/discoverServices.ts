import { PricingClient, DescribeServicesCommand } from '@aws-sdk/client-pricing';
import dotenv from 'dotenv';
dotenv.config();

const client = new PricingClient({ region: 'us-east-1' });

async function run() {
  console.log('Discovering AWS services from Pricing API...');
  let nextToken: string | undefined = undefined;
  const services: { code: string; count: number }[] = [];
  do {
    // Anotación explícita: evita la inferencia circular de TS sobre el bucle NextToken.
    const res: { Services?: { ServiceCode?: string; AttributeNames?: string[] }[]; NextToken?: string } =
      await client.send(new DescribeServicesCommand({ NextToken: nextToken }));
    if (res.Services) {
      services.push(...res.Services.map(s => ({ code: s.ServiceCode ?? '', count: s.AttributeNames?.length ?? 0 })));
    }
    nextToken = res.NextToken;
  } while (nextToken);

  console.log(`Total services discovered: ${services.length}`);
  const targets = ['AmazonRDS', 'AmazonS3', 'AWSLambda', 'AmazonDynamoDB', 'AmazonSNS', 'AmazonCloudFront', 'AmazonRoute53', 'AmazonEC2'];
  
  for (const t of targets) {
    const found = services.find(s => s.code.toLowerCase() === t.toLowerCase());
    console.log(`Target: ${t} -> Found: ${found ? found.code : 'NOT FOUND'} (${found?.count} attributes)`);
  }

  // Also print all service codes that match any substring
  const interesting = services.filter(s =>
    ['rds', 's3', 'lambda', 'dynamo', 'sns', 'cloudfront', 'route53'].some(k => s.code.toLowerCase().includes(k))
  );
  console.log('Interesting matches:');
  interesting.forEach(i => console.log(` - ${i.code} (${i.count} attrs)`));
}

run().catch(err => {
  console.error('Discovery error:', err);
  process.exit(1);
});
