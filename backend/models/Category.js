const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    issueName: {
      type: String,
      required: [true, 'Issue name is required'],
      unique: true,
      trim: true
    },
    departmentName: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
