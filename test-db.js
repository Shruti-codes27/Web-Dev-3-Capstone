require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('Testing MongoDB connection...');
  console.log(`Target URI: ${uri ? uri.replace(/:([^:@]{1,})@/, ':****@') : 'UNDEFINED'}\n`);

  if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.log('NOTE: You are currently pointing to a LOCAL MongoDB instance.');
    console.log('If MongoDB is not installed locally on your PC, this will time out after 5 seconds.\n');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(' SUCCESS: Connected to MongoDB successfully!');
    console.log(` Host: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
    console.log('\nYou are ready to run:');
    console.log('   npm run seed');
    process.exit(0);
  } catch (err) {
    console.error(' CONNECTION FAILED!');
    console.error(` Error: ${err.message}\n`);
    console.log('Troubleshooting tips:');
    console.log('1. If using MongoDB Atlas (Cloud):');
    console.log('   - Verify your username and password in .env (replace <password> with your actual password).');
    console.log('   - Ensure Network Access is set to "Allow Access from Anywhere" (0.0.0.0/0) in Atlas.');
    console.log('2. If using Local MongoDB:');
    console.log('   - Ensure MongoDB service is installed and running.');
    process.exit(1);
  }
}

testConnection();
