import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Cache connection in development to prevent exponential growth during hot reloads
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      // Run data isolation migration asynchronously
      runMigration();
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

// Migrate legacy policies/logs without userId to master admin on startup
async function runMigration() {
  try {
    const Admin = mongoose.models.Admin || require('../models/Admin').default;
    const Policy = mongoose.models.Policy || require('../models/Policy').default;
    const AuditLog = mongoose.models.AuditLog || require('../models/AuditLog').default;

    // Check for orphaned records
    const orphanedPolicyCount = await Policy.countDocuments({ userId: { $exists: false } });
    const orphanedLogCount = await AuditLog.countDocuments({ userId: { $exists: false } });

    if (orphanedPolicyCount > 0 || orphanedLogCount > 0) {
      const masterAdmin = await Admin.findOne();
      if (masterAdmin) {
        console.log(`[MIGRATION] Found ${orphanedPolicyCount} orphaned policies and ${orphanedLogCount} orphaned logs. Migrating to Admin ID: ${masterAdmin._id}`);
        
        await Policy.updateMany({ userId: { $exists: false } }, { $set: { userId: masterAdmin._id } });
        await AuditLog.updateMany({ userId: { $exists: false } }, { $set: { userId: masterAdmin._id } });
        
        console.log('[MIGRATION] Database data isolation migration completed successfully.');
      } else {
        console.log('[MIGRATION WARNING] Orphaned records found, but no Admin user exists in the database yet to link them.');
      }
    }
  } catch (err) {
    console.error('[MIGRATION ERROR] Failed to run data isolation migration:', err);
  }
}
