const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please provide your name'],
    minlength: [5, 'User name must have at least 5 characters'],
    maxlength: [50, 'User name length limit is 50 characters'],
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    required: [true, 'Please provide your email'],
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide your password'],
    minlength: [8, 'Password must have at least 8 characters'],
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  passwordChangedAt: Date,
  avatar: {
    type: String,
    default: '/uploads/example.jpeg',
  },
  calendarList: [
    {
      calendar: {
        type: mongoose.Types.ObjectId,
        ref: 'Calendar',
      },
      otherTitle: String,
      role: {
        type: String,
        enum: ['reader', 'writer', 'owner'],
      },
      isPrimary: Boolean,
    },
  ],
});

// MIDDLEWARES
/**
 * Hash user's password before saving to database.
 */
userSchema.pre('save', async function (next) {
  // NOTE: `save` hook: only runs before/after .save() or create()
  // only run this middleware if password was actually modified
  if (!this.isModified('password')) return next();

  // hashing password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

/**
 * Update `passwordChangedAt` when updating password
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// INSTANCE METHODS
/**
 * Compare password with ecrypted one
 * @param {string} candidatePassword
 * @returns {boolean} true if they are equal, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

/**
 * Check if user changed password after the token was issued
 * @param {number} jwtIat - The time at which JWT was issued (in seconds)
 * @returns {boolean} true if password has been modified after token was issuing, false otherwise
 */
userSchema.methods.isPasswordChanged = function (jwtIat) {
  if (this.passwordChangedAt) {
    const passwordChangedAt = this.passwordChangedAt.getTime() / 1000;
    return passwordChangedAt > jwtIat;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
