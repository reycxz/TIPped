const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true
    },
    prefix: {
      type: String,
      required: [true, 'Department prefix is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [3, 'Department prefix cannot exceed 3 characters']
    }
  },
  {
    timestamps: true
  }
);

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
