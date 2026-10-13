const cron = require('node-cron');
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const Report = require('./models/Report');
const { deleteTicketImages, inspectTicketImages } = require('./utils/cloudinaryCleanup');

const ARCHIVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const ARCHIVE_CLEANUP_MAX_DELETIONS = 100;
const ARCHIVE_CLEANUP_SCAN_LIMIT = 300;

const archivedTicketCleanupTask = cron.schedule('0 0 * * *', async () => {
  const mode = String(process.env.ARCHIVE_CLEANUP_DRY_RUN ?? '').trim() === 'false'
    ? 'live'
    : 'dry-run';
  const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS);
  const totals = {
    mode,
    scanned: 0,
    deleted: 0,
    wouldDelete: 0,
    deferred: 0,
    skippedIneligible: 0,
    imagesRequested: 0,
    imagesDeleted: 0,
    imagesFailed: 0,
    imagesExternal: 0,
    imagesInvalid: 0
  };

  try {
    const tickets = await Ticket.find({
      isArchived: true,
      archivedAt: { $lt: cutoff }
    })
      .select('_id images')
      .sort({ archivedAt: 1, _id: 1 })
      .limit(ARCHIVE_CLEANUP_SCAN_LIMIT)
      .lean();

    for (const ticket of tickets) {
      if (
        (mode === 'live' && totals.deleted >= ARCHIVE_CLEANUP_MAX_DELETIONS)
        || (mode === 'dry-run' && totals.wouldDelete >= ARCHIVE_CLEANUP_MAX_DELETIONS)
      ) {
        break;
      }

      totals.scanned += 1;
      try {
        if (mode === 'dry-run') {
          const imageCounts = inspectTicketImages(ticket);
          totals.imagesRequested += imageCounts.requested;
          totals.imagesExternal += imageCounts.external;
          totals.imagesInvalid += imageCounts.invalid;

          if (imageCounts.invalid > 0) {
            totals.deferred += 1;
            console.log('Archived ticket cleanup deferred', {
              ticketId: String(ticket._id),
              images: imageCounts
            });
          } else {
            totals.wouldDelete += 1;
          }
          continue;
        }

        const eligibilityFilter = {
          _id: ticket._id,
          isArchived: true,
          archivedAt: { $lt: cutoff }
        };
        const eligible = await Ticket.exists(eligibilityFilter);
        if (!eligible) {
          totals.skippedIneligible += 1;
          continue;
        }

        const imageInspection = inspectTicketImages(ticket);
        totals.imagesRequested += imageInspection.requested;
        totals.imagesExternal += imageInspection.external;
        totals.imagesInvalid += imageInspection.invalid;

        if (imageInspection.invalid > 0) {
          totals.deferred += 1;
          console.log('Archived ticket cleanup deferred', {
            ticketId: String(ticket._id),
            images: imageInspection
          });
          continue;
        }

        const imageCounts = await deleteTicketImages(ticket);
        totals.imagesDeleted += imageCounts.deleted;
        totals.imagesFailed += imageCounts.failed;

        if (imageCounts.failed > 0) {
          totals.deferred += 1;
          console.log('Archived ticket cleanup deferred', {
            ticketId: String(ticket._id),
            images: imageCounts
          });
          continue;
        }

        const deletion = await Ticket.deleteOne(eligibilityFilter);
        if (deletion.deletedCount === 1) {
          totals.deleted += 1;
        } else {
          totals.deferred += 1;
          console.log('Archived ticket cleanup deferred', {
            ticketId: String(ticket._id),
            reason: 'ImagesDeletedButTicketNotDeleted'
          });
        }
      } catch (error) {
        totals.deferred += 1;
        console.error('Archived ticket cleanup item failed', {
          ticketId: String(ticket._id),
          errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error'
        });
      }
    }
  } catch (error) {
    console.error('Archived ticket cleanup job failed', {
      errorName: error && /^[A-Za-z0-9_.-]+$/.test(error.name) ? error.name : 'Error',
      ...totals
    });
    return;
  }

  console.log('Archived ticket cleanup complete', totals);
}, { name: 'archived-ticket-cleanup', timezone: 'UTC', noOverlap: true });

const privacyConsentCleanupTask = cron.schedule('0 0 * * *', async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const users = await User.find({
      role: { $in: ['User', 'user'] },
      hasAcceptedPrivacyPolicy: { $ne: true },
      declinedAt: { $lt: cutoff }
    }).select('_id');

    for (const user of users) {
      try {
        await Report.updateMany(
          { $or: [{ submittedBy: user._id }, { reportedBy: user._id }] },
          {
            $set: {
              submittedBy: null,
              reportedBy: null,
              guestEmail: null
            }
          }
        );
        await User.findByIdAndDelete(user._id);
        console.log(`Deleted declined unconsented user ${user._id} after anonymizing reports`);
      } catch (error) {
        console.error(`Privacy cleanup failed for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Privacy consent cleanup job failed:', error);
  }
});

module.exports = { archivedTicketCleanupTask, privacyConsentCleanupTask };
