const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  telephoneNumber: {
    type: String,
    required: [true, 'Please add a telephone number'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  },
  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipProgram'
  },
  membershipStatus: {
    type: String,
    enum: ['inactive', 'active', 'cancelled'],
    default: 'inactive'
  },
  membershipPoints: {
    type: Number,
    default: 0
  },
  membershipStartDate: {
    type: Date,
    default: Date.now
  },
  membershipEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  redeemedRewards: [{
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipProgram.rewards'
    },
    membershipProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipProgram'
    },
    redeemedAt: {
      type: Date,
      default: Date.now
    },
    pointsSpent: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['redeemed', 'used', 'cancelled'],
      default: 'redeemed'
    },
    rewardData: {
      _id: String,
      name: String,
      description: String,
      pointsCost: Number,
      isAvailable: Boolean
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    next();
  }

  // Hash the password with cost factor 10
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Add method to compare entered password with hashed password in DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to redeem a reward
userSchema.methods.redeemReward = async function(rewardId, membershipProgramId) {
  // This would be implemented in the controller, but the schema supports it
  // 1. Find the reward in the membership program
  // 2. Check if user has enough points
  // 3. Deduct points and add to redeemedRewards
  // 4. Return the redemption details
};

module.exports = mongoose.model('User', userSchema);
