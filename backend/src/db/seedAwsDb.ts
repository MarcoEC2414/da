import ratesJson from '../../../shared/awsRates.json';
import regionsJson from '../../../shared/awsRegions.json';
import { getDb, mongoConfigured, closeMongo } from '../db/mongo';

/**
 * Sube el catálogo simulado (awsRates.json + awsRegions.json) a MongoDB Atlas.
 * Ejecutar: npm run seed:aws
 */
async function seed() {
  if (!mongoConfigured()) {
    console.error('MONGODB_URI no está configurada en backend/.env. Nada que sembrar.');
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error('No se pudo conectar a MongoDB Atlas. Revisa MONGODB_URI.');
    process.exit(1);
  }

  const collection = db.collection('aws_catalog');
  await collection.updateOne(
    { slug: 'rates' },
    { $set: { slug: 'rates', data: ratesJson, updatedAt: new Date() } },
    { upsert: true }
  );
  await collection.updateOne(
    { slug: 'regions' },
    { $set: { slug: 'regions', data: regionsJson.regions, updatedAt: new Date() } },
    { upsert: true }
  );

  console.log(`Catálogo simulado sembrado en Atlas (tarifas de ${ratesJson.meta.provider}, ${regionsJson.regions.length} regiones).`);
  await closeMongo();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});