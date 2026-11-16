import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

/** Build every registered model's indexes before tests run (avoids races with background index builds). */
export const initModels = () => Promise.all(Object.values(mongoose.models).map((m) => m.init()));

export const clearDB = async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) await mongoServer.stop();
};
