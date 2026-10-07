const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSuperadmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'superadmin@tip.edu.ph';
    const password = 'SuperAdmin123!';

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
      console.log(`\nCreated new Superadmin account:\n  Email: ${email}\n  Password: ${password}\n  Role: Superadmin\n`);
    } else {
      admin.role = 'Superadmin';
      admin.isVerified = true;
      admin.password = password;
      await admin.save();
      console.log(`\nUpdated existing account to Superadmin:\n  Email: ${email}\n  Password: ${password}\n  Role: Superadmin\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
};

seedSuperadmin();
