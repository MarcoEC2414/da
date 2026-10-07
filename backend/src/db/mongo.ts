import { MongoClient, type Db } from 'mongodb';
import { env, MONGO_AVAILABLE } from '../config/env';

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db | null> | null = null;

export function mongoConfigured(): boolean {
  return MONGO_AVAILABLE;
}

/**
 * Estado de la conexión para GET /api/health. Nunca expone la URI ni credenciales.
 * - not-configured: no hay MONGODB_URI (el backend usa los JSON locales).
 * - connected:      hay una conexión activa a Atlas.
 * - disconnected:   MONGODB_URI está definida pero no se pudo conectar.
 */
export function mongoStatus(): 'not-configured' | 'connected' | 'disconnected' {
  if (!MONGO_AVAILABLE) return 'not-configured';
  return db ? 'connected' : 'disconnected';
}

/**
 * Devuelve la conexión a MongoDB Atlas (simulando el "servidor de catálogos de
 * AWS"). Si no está configurada, devuelve null y el backend usa los JSON locales.
 */
export async function getDb(): Promise<Db | null> {
  if (!MONGO_AVAILABLE) return null;
  if (db) return db;
  if (!connecting) {
    connecting = (async () => {
      try {
        client = new MongoClient(env.MONGODB_URI!, { serverSelectionTimeoutMS: 4000 });
        await client.connect();
        db = client.db();
        return db;
      } catch {
        await client?.close().catch(() => undefined);
        client = null;
        connecting = null;
        return null;
      }
    })();
  }
  return connecting;
}

export async function closeMongo(): Promise<void> {
  connecting = null;
  await client?.close().catch(() => undefined);
  client = null;
  db = null;
}