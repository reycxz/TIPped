const dns = require('dns');
const path = require('path');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSuperadmin = async () => {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing SEED_SUPERADMIN_EMAIL or SEED_SUPERADMIN_PASSWORD');
    process.exitCode = 1;
    return;
  }

  if (password.length < 12) {
    console.error('SEED_SUPERADMIN_PASSWORD must be at least 12 characters');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ email });
    if (!admin) {
      admin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email,
        password,
        role: 'Superadmin',
        isVerified: true
      });
      await admin.save();
      console.log('\nCreated new Superadmin account with role: Superadmin\n');
    } else {
      admin.role = 'Superadmin';
      admin.isVerified = true;
      admin.password = password;
      await admin.save();
      console.log('\nUpdated existing account to Superadmin.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
};

seedSuperadmin();
