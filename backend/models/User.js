const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    program: {
      type: String,
      trim: true,
      default: 'Not Specified'
    },
    password: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return v.length >= 6;
        },
        message: 'Password must be at least 6 characters'
      }
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    role: {
      type: String,
      enum: {
        values: ['User', 'user', 'Department', 'department', 'Superadmin', 'superadmin'],
        message: '{VALUE} is not a supported role'
      },
      default: 'user'
    },
    assignedCategories: {
      type: [String],
      default: []
    },
    departmentCategory: {
      type: String,
      trim: true,
      default: null
    },
    avatar: {
      type: String,
      default: 'avatar-1'
    },
    // Supporting OTP verification as defined in RULES.md
    otp: {
      type: String,
      default: null
    },
    otpExpires: {
      type: Date,
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password and sync category fields
userSchema.pre('save', async function (next) {
  const done = typeof next === 'function' ? next : () => {};
  if (!this.isModified('password')) return done();

  if (Array.isArray(this.assignedCategories) && this.assignedCategories.length > 0 && !this.departmentCategory) {
    this.departmentCategory = this.assignedCategories[0];
  } else if (this.departmentCategory && (!this.assignedCategories || this.assignedCategories.length === 0)) {
    this.assignedCategories = [this.departmentCategory];
  }

  if (!this.password) return done();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return done();
  } catch (err) {
    throw new Error(err.message || 'Error hashing password');
  }
});

// Compare entered password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
