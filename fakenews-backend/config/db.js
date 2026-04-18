const mongoose = require('mongoose');

const connectDB = async () => {
  const isDockerRuntime = process.env.NODE_ENV === 'production';
  const fallbackUri = isDockerRuntime
    ? 'mongodb://mongodb:27017/capstoneproject'
    : 'mongodb://localhost:27017/capstoneproject';

  const mongoUri = process.env.MONGO_URI || fallbackUri;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    console.log(`MongoDB URI source: ${process.env.MONGO_URI ? 'MONGO_URI env' : 'runtime fallback'}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('MongoDB connection hint:');
    console.error('- Docker backend: mongodb://mongodb:27017/capstoneproject');
    console.error('- Local backend:  mongodb://localhost:27017/capstoneproject');
    console.error('- Local backend + Docker Mongo: mongodb://localhost:27018/capstoneproject');
    process.exit(1);
  }
};

module.exports = connectDB;
