const missingOrInvalid = [];
const jwtSecret = process.env.JWT_SECRET;
const mongoUri = process.env.MONGO_URI;

if (!jwtSecret || jwtSecret.trim().length < 32) {
  missingOrInvalid.push('JWT_SECRET');
}

if (!mongoUri || !mongoUri.trim()) {
  missingOrInvalid.push('MONGO_URI');
}

if (missingOrInvalid.length > 0) {
  console.error(`Missing or invalid environment variables: ${missingOrInvalid.join(', ')}`);
  process.exit(1);
}
