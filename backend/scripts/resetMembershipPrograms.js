const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import models
const User = require('../models/user');
const MembershipProgram = require('../models/Membership');

// Define default membership programs with ascending points requirements
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
    pointsRequired: 200,
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
    pointsRequired: 300,
    benefits: [
      { description: 'Platinum benefits plus:' },
      { description: 'VIP customer support' },
      { description: 'Exclusive member events' },
      { description: 'Personal account manager' }
    ]
  }
];

// Reset and seed membership programs
const resetAndSeedMemberships = async () => {
  try {
    console.log('Starting membership programs reset...');
    
    // Delete all existing membership programs
    console.log('Deleting existing membership programs...');
    await MembershipProgram.deleteMany({});
    console.log('All existing membership programs deleted');
    
    // Create default membership programs
    console.log('Creating default membership programs...');
    const createdPrograms = await MembershipProgram.insertMany(defaultMembershipPrograms);
    console.log(`Created ${createdPrograms.length} membership programs`);
    
    // Find basic membership program for new users
    const basicProgram = createdPrograms.find(p => p.type === 'basic');
    
    if (!basicProgram) {
      throw new Error('Basic membership program not found');
    }
    
    // Update all users without membership to basic
    const updatedUsers = await User.updateMany(
      { membership: { $exists: false } }, 
      { 
        $set: { 
          membership: basicProgram._id,
          membershipStatus: 'active',
          membershipPoints: 0,
          membershipStartDate: new Date(),
          membershipEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        } 
      }
    );
    
    console.log(`Updated ${updatedUsers.modifiedCount} users with basic membership`);
    
    // Update user tiers based on their points
    console.log('Updating user membership tiers based on points...');
    const allUsers = await User.find({ membershipPoints: { $gt: 0 } });
    
    let upgradedUsers = 0;
    
    for (const user of allUsers) {
      // Find the highest tier the user qualifies for based on points
      const eligiblePrograms = createdPrograms
        .filter(program => user.membershipPoints >= program.pointsRequired)
        .sort((a, b) => b.pointsRequired - a.pointsRequired);
      
      if (eligiblePrograms.length > 0) {
        const highestEligibleProgram = eligiblePrograms[0];
        
        // Only update if the user's tier would change
        if (!user.membership || user.membership.toString() !== highestEligibleProgram._id.toString()) {
          user.membership = highestEligibleProgram._id;
          await user.save();
          upgradedUsers++;
        }
      }
    }
    
    console.log(`Upgraded ${upgradedUsers} users to higher membership tiers`);
    console.log('Membership reset and upgrade completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during membership reset:', error);
    process.exit(1);
  }
};

// Add event handler for new user registration
const setupAutoAssignmentForNewUsers = () => {
  console.log('Note: New users will be automatically assigned to the Basic membership tier upon registration.');
  console.log('Implement this in your user registration logic with code like:');
  console.log(`
  // In your user registration controller:
  
  // 1. Find the basic membership program
  const basicProgram = await MembershipProgram.findOne({ type: 'basic' });
  
  // 2. Assign it to the new user
  newUser.membership = basicProgram._id;
  newUser.membershipStatus = 'active';
  newUser.membershipPoints = 0;
  newUser.membershipStartDate = new Date();
  newUser.membershipEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  
  // 3. Save the user
  await newUser.save();
  `);
};

// Run script
(async () => {
  await resetAndSeedMemberships();
  setupAutoAssignmentForNewUsers();
})(); 