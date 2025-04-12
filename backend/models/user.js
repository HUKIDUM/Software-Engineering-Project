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
    type: {
      type: String,
      enum: ['none', 'basic', 'premium'],
      default: 'none'
    },
    status: {
      type: String,
      enum: ['inactive', 'active', 'cancelled'],
      default: 'inactive'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    // ← new field for reward points
    points: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ... rest of schema (pre‑save hook, methods, etc.)

module.exports = mongoose.model('User', userSchema);
