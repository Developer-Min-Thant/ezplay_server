const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false // Don't return password by default
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'apple'],
    default: 'local'
  },
  totalDownloads: {
    type: Number,
    default: 0
  },
  ispremiumActive: {
    type: Boolean,
    default: false
  },
  premiumStartDate: {
    type: Date
  },
  premiumExpirationDate: {
    type: Date
  },
  deviceId: {
    type: String,
    required: true,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new) and exists
  if (!this.password || !this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
