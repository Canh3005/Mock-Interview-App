import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
  console.log('Starting migration script...');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  // Connect to MongoDB
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  console.log('Connected to MongoDB');
  const dbName = new URL(mongoUri).pathname.substring(1) || 'mock-interview-app';
  const db = mongoClient.db(dbName);
  const mongoUsersCollection = db.collection('users');
  const mongoIdentitiesCollection = db.collection('identities');

  // Connect to PostgreSQL
  const pgPool = new Pool({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'mock_interview_db',
  });
  console.log('Connected to PostgreSQL');

  try {
    const mongoUsers = await mongoUsersCollection.find().toArray();
    console.log(`Found ${mongoUsers.length} users in MongoDB.`);

    for (const mUser of mongoUsers) {
      const id = mUser._id.toString();
      const existing = await pgPool.query('SELECT id FROM "user" WHERE id = $1', [id]);
      
      if (existing.rows.length === 0) {
        await pgPool.query(
          `INSERT INTO "user" ("id", "email", "passwordHash", "name", "avatarUrl", "refreshTokenHash", "role", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            mUser.email,
            mUser.passwordHash || null,
            mUser.name,
            mUser.avatarUrl || null,
            mUser.refreshTokenHash || null,
            mUser.role || 'user',
            mUser.createdAt || new Date(),
            mUser.updatedAt || new Date(),
          ]
        );
      }
    }
    console.log('Users migration completed.');

    const mongoIdentities = await mongoIdentitiesCollection.find().toArray();
    console.log(`Found ${mongoIdentities.length} identities in MongoDB.`);

    for (const mIdentity of mongoIdentities) {
      const id = mIdentity._id.toString();
      const existing = await pgPool.query('SELECT id FROM "identity" WHERE id = $1', [id]);
      
      if (existing.rows.length === 0) {
        await pgPool.query(
          `INSERT INTO "identity" ("id", "user_id", "provider", "providerId", "profileData", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            mIdentity.userId.toString(),
            mIdentity.provider,
            mIdentity.providerId,
            mIdentity.profileData || {},
            mIdentity.createdAt || new Date(),
            mIdentity.updatedAt || new Date(),
          ]
        );
      }
    }
    console.log('Identities migration completed.');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoClient.close();
    await pgPool.end();
  }
}

migrate().then(() => {
  console.log('Migration finished.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

