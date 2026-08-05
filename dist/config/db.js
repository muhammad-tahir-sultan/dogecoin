"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const getMongoUri = () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MongoDB URI is not configured. Set MONGODB_URI or MONGO_URI.');
    }
    return uri;
};
const connectDB = async () => {
    if (global.mongooseCache?.conn) {
        return global.mongooseCache.conn;
    }
    if (!global.mongooseCache) {
        global.mongooseCache = { conn: null, promise: null };
    }
    if (!global.mongooseCache.promise) {
        const uri = getMongoUri();
        global.mongooseCache.promise = mongoose_1.default.connect(uri, {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
        });
    }
    try {
        global.mongooseCache.conn = await global.mongooseCache.promise;
        console.log(`MongoDB Connected: ${global.mongooseCache.conn.connection.host}`);
        return global.mongooseCache.conn;
    }
    catch (error) {
        global.mongooseCache.promise = null;
        throw error;
    }
};
exports.default = connectDB;
