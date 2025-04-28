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

/**
 * This script checks all users and updates their membership tier
 * based on their current points. It will:
 * 1. Get all membership programs ordered by points required
 * 2. For each user with active membership, find the highest tier they qualify for
 * 3. Update their membership if they qualify for a higher tier
 */
const updateMembershipTiers = async () => {
  try {
    console.log('Starting membership tier updates...');
    
    // Get all membership programs sorted by points required (ascending)
    const membershipPrograms = await MembershipProgram.find().sort({ pointsRequired: 1 });
    
    if (membershipPrograms.length === 0) {
      console.error('No membership programs found in the database');
      process.exit(1);
    }
    
    console.log(`Found ${membershipPrograms.length} membership programs`);
    
    // Get all users with active membership status
    const users = await User.find({ 
      membershipStatus: 'active',
      membershipPoints: { $exists: true }
    });
    
    console.log(`Found ${users.length} active users to check for tier updates`);
    
    let upgradedUsers = 0;
    let downgradedUsers = 0;
    
    for (const user of users) {
      // Find the highest tier the user qualifies for
      const eligiblePrograms = membershipPrograms
        .filter(program => user.membershipPoints >= program.pointsRequired)
        .sort((a, b) => b.pointsRequired - a.pointsRequired);
      
      if (eligiblePrograms.length > 0) {
        const highestEligibleProgram = eligiblePrograms[0];
        
        // Get current program (if any)
        const currentProgramId = user.membership ? user.membership.toString() : null;
        const newProgramId = highestEligibleProgram._id.toString();
        
        // Check if user's tier needs to change
        if (currentProgramId !== newProgramId) {
          // Update user's membership
          const oldProgram = currentProgramId 
            ? membershipPrograms.find(p => p._id.toString() === currentProgramId)
            : null;
          
          user.membership = highestEligibleProgram._id;
          await user.save();
          
          if (oldProgram) {
            // Determine if this is an upgrade or downgrade
            if (highestEligibleProgram.pointsRequired > oldProgram.pointsRequired) {
              upgradedUsers++;
              console.log(`Upgraded user ${user.email} from ${oldProgram.name} to ${highestEligibleProgram.name}`);
            } else {
              downgradedUsers++;
              console.log(`Downgraded user ${user.email} from ${oldProgram.name} to ${highestEligibleProgram.name}`);
            }
          } else {
            upgradedUsers++;
            console.log(`Assigned user ${user.email} to ${highestEligibleProgram.name}`);
          }
        }
      }
    }
    
    console.log(`Upgraded ${upgradedUsers} users to higher tiers`);
    console.log(`Downgraded ${downgradedUsers} users to lower tiers`);
    console.log('Membership tier updates completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during membership tier updates:', error);
    process.exit(1);
  }
};

// Run the script
updateMembershipTiers(); 