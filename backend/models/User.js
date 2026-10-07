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
      default: ''
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: {
        values: ['User', 'Department', 'Superadmin'],
        message: '{VALUE} is not a supported role'
      },
      default: 'User'
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
userSchema.pre('save', async function () {
  if (Array.isArray(this.assignedCategories) && this.assignedCategories.length > 0 && !this.departmentCategory) {
    this.departmentCategory = this.assignedCategories[0];
  } else if (this.departmentCategory && (!this.assignedCategories || this.assignedCategories.length === 0)) {
    this.assignedCategories = [this.departmentCategory];
  }

  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
