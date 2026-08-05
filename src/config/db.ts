import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const getMongoUri = (): string => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MongoDB URI is not configured. Set MONGODB_URI or MONGO_URI.');
  }
  return uri;
};

const connectDB = async (): Promise<typeof mongoose> => {
  if (global.mongooseCache?.conn) {
    return global.mongooseCache.conn;
  }

  if (!global.mongooseCache) {
    global.mongooseCache = { conn: null, promise: null };
  }

  if (!global.mongooseCache.promise) {
    const uri = getMongoUri();
    global.mongooseCache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    global.mongooseCache.conn = await global.mongooseCache.promise;
    console.log(`MongoDB Connected: ${global.mongooseCache.conn.connection.host}`);
    return global.mongooseCache.conn;
  } catch (error) {
    global.mongooseCache.promise = null;
    throw error;
  }
};

export default connectDB;
