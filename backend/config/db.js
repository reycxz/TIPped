const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers to resolve MongoDB Atlas SRV records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Fallback to default system resolvers if not supported
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tipped');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Constraint 2: Force MongoDB to clear the old invalid index on departments
    const Department = require('../models/Department');
    await Department.collection
      .dropIndex('categoryName_1')
      .catch((err) => console.log('Index not found or already dropped'));
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
