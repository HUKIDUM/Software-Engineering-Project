const mongoose = require('mongoose');
const User = require('../models/user');
const Membership = require('../models/Membership');
require('dotenv').config();

/**
 * Script to migrate membership data from the embedded structure in the User model
 * to the new separate Membership model.
 * 
 * This script should be run once after deploying the new models.
 */

async function migrateMemberships() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Get all users with embedded membership data
    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users. Processing...`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        // Skip users without embedded membership or with just a reference
        if (!user.membership || typeof user.membership !== 'object' || mongoose.Types.ObjectId.isValid(user.membership)) {
          skipped++;
          continue;
        }

        // Create a new membership document
        const membershipData = {
          user: user._id,
          type: user.membership.type || 'none',
          status: user.membership.status || 'inactive',
          points: user.membership.points || 0,
        };

        if (user.membership.startDate) {
          membershipData.startDate = user.membership.startDate;
        }

        if (user.membership.endDate) {
          membershipData.endDate = user.membership.endDate;
        }

        // Create and save the new membership
        const membership = await Membership.create(membershipData);
        
        // Update the user with the membership reference
        await User.findByIdAndUpdate(user._id, { membership: membership._id });
        
        console.log(`Migrated membership for user: ${user.email}`);
        migrated++;
      } catch (err) {
        console.error(`Failed to migrate membership for user ${user.email || user._id}:`, err);
        failed++;
      }
    }

    console.log('\nMigration summary:');
    console.log(`Total users: ${users.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Skipped (no membership data): ${skipped}`);
    console.log(`Failed: ${failed}`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Run the migration
migrateMemberships().catch(err => {
  console.error('Uncaught error during migration:', err);
  process.exit(1);
}); 