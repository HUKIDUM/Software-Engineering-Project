const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Set up models
// Note: We need to keep both old and new model definitions for the migration
const User = require('../models/user');

// Old Membership model definition (before changes)
const OldMembershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  type: String,
  status: String,
  startDate: Date,
  endDate: Date,
  points: Number,
  createdAt: Date
});

const OldMembership = mongoose.model('Membership', OldMembershipSchema, 'memberships');

// New MembershipProgram model
const MembershipProgram = require('../models/Membership');

// Define default membership programs
const defaultMembershipPrograms = [
  {
    name: 'Basic Membership',
    type: 'basic',
    description: 'Basic membership benefits',
    pointsRequired: 0,
    benefits: [
      { description: 'Access to member-only sections' },
      { description: 'Basic customer support' }
    ]
  },
  {
    name: 'Gold Membership',
    type: 'gold',
    description: 'Gold level membership with enhanced benefits',
    pointsRequired: 100,
    benefits: [
      { description: 'Basic benefits plus:' },
      { description: 'Priority customer support' },
      { description: 'Exclusive discounts' }
    ]
  },
  {
    name: 'Platinum Membership',
    type: 'platinum',
    description: 'Premium membership with great benefits',
    pointsRequired: 30,
    benefits: [
      { description: 'Gold benefits plus:' },
      { description: 'Premium content access' },
      { description: 'Special events access' }
    ]
  },
  {
    name: 'Diamond Membership',
    type: 'diamond',
    description: 'Elite level membership with exclusive benefits',
    pointsRequired: 200,
    benefits: [
      { description: 'Platinum benefits plus:' },
      { description: 'VIP customer support' },
      { description: 'Exclusive member events' },
      { description: 'Personal account manager' }
    ]
  }
];

// Migration function
const migrate = async () => {
  try {
    console.log('Migration started...');
    
    // Create the default membership programs
    console.log('Creating default membership programs...');
    for (const program of defaultMembershipPrograms) {
      // Skip if already exists
      const exists = await MembershipProgram.findOne({ name: program.name });
      if (!exists) {
        await MembershipProgram.create(program);
        console.log(`Created ${program.name} program`);
      } else {
        console.log(`${program.name} program already exists`);
      }
    }
    
    // Get all membership programs for reference
    const membershipPrograms = await MembershipProgram.find();
    
    // Get all users with old memberships
    const oldMemberships = await OldMembership.find();
    console.log(`Found ${oldMemberships.length} old memberships to migrate`);
    
    for (const oldMembership of oldMemberships) {
      // Get the user
      const user = await User.findById(oldMembership.user);
      
      if (!user) {
        console.log(`User ${oldMembership.user} not found, skipping`);
        continue;
      }
      
      // Find appropriate membership program based on type
      const programType = oldMembership.type || 'basic';
      const membershipProgram = membershipPrograms.find(p => p.type === (programType === 'none' ? 'basic' : programType));
      
      if (!membershipProgram) {
        console.log(`No membership program found for type ${programType}, skipping`);
        continue;
      }
      
      // Update user with the membership details
      user.membership = membershipProgram._id;
      user.membershipStatus = oldMembership.status || 'inactive';
      user.membershipPoints = oldMembership.points || 0;
      user.membershipStartDate = oldMembership.startDate || new Date();
      user.membershipEndDate = oldMembership.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await user.save();
      console.log(`Migrated membership for user ${user.email}`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

// Run the migration
migrate(); 