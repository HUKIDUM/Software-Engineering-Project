const mongoose = require('mongoose');

const membershipProgramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a membership program name'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['none', 'basic', 'gold', 'platinum', 'diamond'],
    default: 'basic',
    required: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  pointsRequired: {
    type: Number,
    required: [true, 'Please specify points required for this membership level'],
    min: 0
  },
  benefits: [{
    description: {
      type: String,
      required: true
    },
    value: {
      type: String
    }
  }],
  rewards: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp when document is updated
membershipProgramSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find all eligible membership programs for a given points amount
membershipProgramSchema.statics.findEligiblePrograms = async function(points) {
  return await this.find({
    pointsRequired: { $lte: points },
    isActive: true
  }).sort({ pointsRequired: -1 });
};

module.exports = mongoose.model('MembershipProgram', membershipProgramSchema); 