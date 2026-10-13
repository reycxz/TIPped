const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const Ticket = require('../models/Ticket');
const INDEX_NAME = 'archivedAt_1';
const shouldApply = process.argv.includes('--apply');

const main = async () => {
  if (!shouldApply) {
    console.log(`DRY RUN: would drop index ${INDEX_NAME}. Run this script after the archived-ticket cleanup job is deployed.`);
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error('Cannot apply index removal: MONGO_URI is not set.');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const exists = await Ticket.collection.indexExists(INDEX_NAME);
    if (exists) {
      await Ticket.collection.dropIndex(INDEX_NAME);
      console.log(`Dropped index ${INDEX_NAME}.`);
    } else {
      console.log(`Index ${INDEX_NAME} is already absent.`);
    }
  } catch (error) {
    console.error('Archive TTL index operation failed', {
      errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error'
    });
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Archive TTL index connection cleanup failed', {
        errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error'
      });
      process.exitCode = 1;
    }
  }
};

main();
