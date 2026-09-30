import mongoose from 'mongoose';
import { config } from '../config/env';

let isConnected = false;

// Disable command buffering globally so operations fail fast to the memory fallback
// instead of hanging for 10,000ms waiting for a connection
mongoose.set('bufferCommands', false);

/**
 * Initializes MongoDB Atlas connection with graceful failure handling.
 * If connection fails or no MONGODB_URI is provided, the server remains healthy
 * and operates seamlessly in resilient offline mode without emitting fatal errors.
 */
export async function connectDatabase(): Promise<boolean> {
  const uri = config.mongodb.uri;

  if (!uri) {
    console.log('[DATABASE] No MONGODB_URI configured. Backend running in resilient offline mode.');
    isConnected = false;
    return false;
  }

  // Prevent multiple connection attempts if already connected
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  try {
    // Sanitize URI for safe logging (strip credentials)
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`[DATABASE] Connecting to MongoDB: ${sanitizedUri}`);

    await mongoose.connect(uri, {
      dbName: config.mongodb.dbName,
      maxPoolSize: config.mongodb.maxPoolSize,
      serverSelectionTimeoutMS: 3000, // 3s timeout for fast fallback
      connectTimeoutMS: 3000,
    });

    isConnected = true;
    console.log('[DATABASE] Successfully connected to MongoDB Atlas.');

    mongoose.connection.on('error', (err) => {
      console.warn('[DATABASE] MongoDB connection notice:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DATABASE] MongoDB disconnected. Operating in resilient offline mode.');
      isConnected = false;
    });

    return true;
  } catch (err: any) {
    isConnected = false;
    // Clean up any pending socket state
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    // Log diagnostic warning (use console.warn to indicate graceful fallback, not fatal crash)
    console.warn(
      `[DATABASE] MongoDB Atlas unavailable (${err.message}). ` +
      `Note: Ensure your MongoDB Atlas cluster has IP Whitelist set to 0.0.0.0/0 (Network Access -> Add IP -> Allow Access Anywhere). ` +
      `Backend running smoothly in resilient memory fallback mode.`
    );
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore
    }
    isConnected = false;
    console.log('[DATABASE] Disconnected from MongoDB.');
  }
}
