const mongoose = require('mongoose');
const { NODE_ENV } = require('./loadEnv');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is not configured');
  }

  try {
    await mongoose.connect(mongoURI);
    console.log(`MongoDB connected (${NODE_ENV})`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
