const mongoose = require('mongoose');

const adminRemarkSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: [true, 'Remark note is required'],
      trim: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin user ID is required']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const locationInfoSchema = new mongoose.Schema(
  {
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required']
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true
    },
    landmark: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: [true, 'Ticket ID is required'],
      unique: true,
      trim: true
    },
    campus: {
      type: String,
      required: [true, 'Campus is required'],
      enum: {
        values: ['Arlegui', 'Casal'],
        message: '{VALUE} is not a supported campus'
      }
    },
    locationInfo: {
      type: locationInfoSchema,
      required: [true, 'Location info is required']
    },
    issueCategory: {
      type: String,
      required: [true, 'Issue category is required'],
      trim: true
    },
    assignedDepartment: {
      type: String,
      required: [true, 'Assigned department is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In Progress', 'Resolved'],
        message: '{VALUE} is not a valid status'
      },
      default: 'Pending'
    },
    adminRemarks: {
      type: [adminRemarkSchema],
      default: []
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    auditTrail: [
      {
        action: { type: String, required: true },
        details: { type: String, default: '' },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    // Constraint 1: Soft-delete archive flag and timestamp
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Constraint 1: MongoDB TTL index to auto-delete documents 30 days (2592000s) after archiving
const reportSchema = ticketSchema;
reportSchema.index(
  { archivedAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { isArchived: true } }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
module.exports.reportSchema = reportSchema;
module.exports.ticketSchema = ticketSchema;
