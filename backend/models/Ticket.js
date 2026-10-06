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
    category: {
      type: String,
      required: [true, 'Category is required'],
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
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
