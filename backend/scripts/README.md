# Membership Management Scripts

This directory contains scripts for managing the membership system.

## Available Scripts

### 1. Reset Membership Programs

**File:** `resetMembershipPrograms.js`

This script will:
- Delete all existing membership programs
- Create default membership tiers (Basic, Gold, Platinum, Diamond)
- Assign basic membership to users without any membership
- Update users' tiers based on their current points

**To run:**
```bash
node scripts/resetMembershipPrograms.js
```

### 2. Update Membership Tiers

**File:** `updateMembershipTiers.js`

This script will:
- Check all active users' points
- Upgrade or downgrade users to the appropriate membership tier based on their points
- Log all tier changes

**To run:**
```bash
node scripts/updateMembershipTiers.js
```

Run this script periodically (e.g., via cron job) to ensure users are in the correct membership tier.

### 3. Migrate Legacy Memberships

**File:** `migrateMembership.js`

This script migrates from the old membership system to the new one. Only needed once during the initial system transition.

**To run:**
```bash
node scripts/migrateMembership.js
```

## Membership Tiers

The system includes the following membership tiers:

1. **Basic Membership**
   - Points Required: 0
   - Benefits: Basic access and support

2. **Gold Membership**
   - Points Required: 100
   - Benefits: Basic benefits plus priority support and discounts

3. **Platinum Membership**
   - Points Required: 200
   - Benefits: Gold benefits plus premium content access and special events

4. **Diamond Membership**
   - Points Required: 300
   - Benefits: Platinum benefits plus VIP support, exclusive events, and personal account manager

## Implementation Notes

When a user registers, they should automatically be assigned to the Basic membership tier. This logic should be implemented in your user registration controller.

Example code for assigning a new user to Basic membership:
```javascript
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
``` 