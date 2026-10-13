const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const Ticket = require('../models/Ticket');
const { cloudinary } = require('../config/cloudinary');
const { getPublicIds } = require('../utils/cloudinaryCleanup');

const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Orphan image scan cannot run: MONGO_URI is not set.');
    process.exitCode = 1;
    return;
  }

  const referencedIds = new Set();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const cursor = Ticket.find({ images: { $exists: true, $ne: [] } })
      .select('images')
      .lean()
      .cursor();

    for await (const ticket of cursor) {
      for (const publicId of getPublicIds(ticket.images)) {
        referencedIds.add(publicId);
      }
    }

    let cloudinaryImageCount = 0;
    let orphanImageCount = 0;
    let nextCursor;

    do {
      const page = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        prefix: 'tipped_tickets/',
        max_results: 500,
        ...(nextCursor ? { next_cursor: nextCursor } : {})
      });

      for (const resource of page.resources || []) {
        cloudinaryImageCount += 1;
        if (!referencedIds.has(resource.public_id)) {
          orphanImageCount += 1;
        }
      }
      nextCursor = page.next_cursor;
    } while (nextCursor);

    console.log('DRY RUN image inventory', {
      cloudinaryImages: cloudinaryImageCount,
      referencedPublicIds: referencedIds.size,
      orphanImages: orphanImageCount
    });
  } catch (error) {
    console.error('DRY RUN image inventory failed', {
      errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error'
    });
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('DRY RUN image inventory connection cleanup failed', {
        errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error'
      });
      process.exitCode = 1;
    }
  }
};

main();
