const User = require('../models/user');
const MembershipProgram = require('../models/Membership');

/**
 * Determines membership type based on points
 * @param {Number} points - Current points 
 * @param {Array} programs - Available membership programs
 * @returns {Object} Matching membership program
 */
const getMembershipProgramFromPoints = async (points) => {
  // Find all active membership programs
  const programs = await MembershipProgram.find({ isActive: true }).sort({ pointsRequired: -1 });
  
  // Return the highest tier program that the user qualifies for
  for (const program of programs) {
    if (points >= program.pointsRequired) {
      return program;
    }
  }
  
  // Return the lowest tier (basic) if no matches or user has zero points
  return programs[programs.length - 1] || null;
};

/**
 * Gets all eligible membership programs for a user's points
 * @param {Number} points - Current points
 * @returns {Array} List of eligible membership programs
 */
const getEligibleMembershipPrograms = async (points) => {
  return await MembershipProgram.findEligiblePrograms(points);
};

// @desc    Get current user's membership
// @route   GET /api/v1/memberships
// @access  Private
exports.getMembership = async (req, res) => {
  try {
    // Find the user and populate their membership
    const user = await User.findById(req.user._id).populate('membership');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If user doesn't have a membership yet
    if (!user.membership) {
      return res.status(404).json({ success: false, message: 'No membership found for this user' });
    }

    // Only update membership type if status is active
    if (user.membershipStatus === 'active') {
      // Get the appropriate membership program based on current points
      const membershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
      
      // Update user's membership if it's different from current
      if (membershipProgram && (!user.membership || user.membership._id.toString() !== membershipProgram._id.toString())) {
        user.membership = membershipProgram._id;
        await user.save();
        // Repopulate the membership after update
        await user.populate('membership');
      }
    }

    // Get all eligible membership programs
    const eligiblePrograms = await getEligibleMembershipPrograms(user.membershipPoints);

    res.status(200).json({
      success: true,
      data: {
        currentProgram: user.membership,
        eligiblePrograms: eligiblePrograms,
        status: user.membershipStatus,
        points: user.membershipPoints,
        startDate: user.membershipStartDate,
        endDate: user.membershipEndDate
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create or update user's membership
// @route   POST /api/v1/memberships
// @access  Private
exports.createOrUpdateMembership = async (req, res) => {
  try {
    // We'll only allow status to be provided. Type is automatically determined by points.
    const { status } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update membership status if provided
    if (status) {
      user.membershipStatus = status;
      
      // Reset points to 0 if status is 'cancelled'
      if (status === 'cancelled') {
        user.membershipPoints = 0;
        // Set to null or lowest tier
        const basicProgram = await MembershipProgram.findOne({ type: 'basic' });
        user.membership = basicProgram ? basicProgram._id : null;
      } else if (status === 'active') {
        // If reactivating, determine membership based on points
        const membershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
        if (membershipProgram) {
          user.membership = membershipProgram._id;
        }
      }
    } else if (user.membershipStatus !== 'cancelled') {
      // Always determine membership based on points unless cancelled
      const membershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
      if (membershipProgram) {
        user.membership = membershipProgram._id;
      }
    }

    // Save the user with updated membership
    await user.save();

    // Populate the membership information for the response
    await user.populate('membership');

    res.status(200).json({
      success: true,
      message: 'Membership updated',
      data: {
        program: user.membership,
        status: user.membershipStatus,
        points: user.membershipPoints,
        startDate: user.membershipStartDate,
        endDate: user.membershipEndDate
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update membership points
// @route   PUT /api/v1/memberships/points/:userId
// @access  Private (should be restricted to admin or system)
exports.updatePoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, operation } = req.body;

    if (!points || !['add', 'subtract'].includes(operation)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide points amount and operation (add or subtract)'
      });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Skip points update if membership is cancelled
    if (user.membershipStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update points for a cancelled membership'
      });
    }

    // Update points based on operation
    const previousPoints = user.membershipPoints;
    if (operation === 'add') {
      user.membershipPoints += points;
    } else {
      // Ensure points don't go below 0
      user.membershipPoints = Math.max(0, user.membershipPoints - points);
    }

    // Get previous membership program
    const previousMembership = user.membership;

    // Update membership based on new points
    const membershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
    if (membershipProgram) {
      user.membership = membershipProgram._id;
    }

    await user.save();

    // Check if membership tier changed
    const membershipChanged = !previousMembership || 
      previousMembership.toString() !== user.membership.toString();

    // Populate the membership for the response
    await user.populate('membership');

    if (membershipChanged) {
      console.log(`User ${user.email} membership upgraded from ${previousMembership ? previousMembership.toString() : 'none'} to ${user.membership ? user.membership.type : 'none'}`);
    }

    res.status(200).json({
      success: true,
      message: `Points ${operation === 'add' ? 'added to' : 'deducted from'} membership`,
      data: { 
        points: user.membershipPoints,
        membershipProgram: user.membership,
        membershipChanged: membershipChanged
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all user memberships (admin only)
// @route   GET /api/v1/memberships/users
// @access  Private (Admin)
exports.getAllUserMemberships = async (req, res) => {
  try {
    const users = await User.find().populate('membership').select('name email telephoneNumber membershipStatus membershipPoints membershipStartDate membershipEndDate membership');

    // Update membership types for active users
    for (const user of users) {
      if (user.membershipStatus === 'active') {
        const membershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
        
        if (membershipProgram && (!user.membership || user.membership._id.toString() !== membershipProgram._id.toString())) {
          user.membership = membershipProgram._id;
          await user.save();
          // Repopulate the membership after update
          await user.populate('membership');
        }
      }
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all membership programs
// @route   GET /api/v1/memberships/programs
// @access  Public
exports.getAllMembershipPrograms = async (req, res) => {
  try {
    const programs = await MembershipProgram.find({ isActive: true });

    res.status(200).json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single membership program
// @route   GET /api/v1/memberships/programs/:id
// @access  Public
exports.getMembershipProgram = async (req, res) => {
  try {
    const program = await MembershipProgram.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Membership program not found'
      });
    }

    res.status(200).json({
      success: true,
      data: program
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a membership program
// @route   POST /api/v1/memberships/programs
// @access  Private (Admin)
exports.createMembershipProgram = async (req, res) => {
  try {
    const program = await MembershipProgram.create(req.body);

    res.status(201).json({
      success: true,
      data: program
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A membership program with this name already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a membership program
// @route   PUT /api/v1/memberships/programs/:id
// @access  Private (Admin)
exports.updateMembershipProgram = async (req, res) => {
  try {
    const program = await MembershipProgram.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Membership program not found'
      });
    }

    res.status(200).json({
      success: true,
      data: program
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a membership program
// @route   DELETE /api/v1/memberships/programs/:id
// @access  Private (Admin)
exports.deleteMembershipProgram = async (req, res) => {
  try {
    const program = await MembershipProgram.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Membership program not found'
      });
    }

    await program.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all eligible membership programs for the user
// @route   GET /api/v1/memberships/eligible
// @access  Private
exports.getEligibleMemberships = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const eligiblePrograms = await getEligibleMembershipPrograms(user.membershipPoints);

    res.status(200).json({
      success: true,
      count: eligiblePrograms.length,
      data: eligiblePrograms
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Choose a specific membership program from eligible ones
// @route   POST /api/v1/memberships/choose/:programId
// @access  Private
exports.chooseMembershipProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the requested program
    const program = await MembershipProgram.findById(programId);
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Membership program not found' });
    }

    // Check if user has enough points for this program
    if (user.membershipPoints < program.pointsRequired) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough points for this membership program' 
      });
    }

    // Check if program is active
    if (!program.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'This membership program is not currently active' 
      });
    }

    // Update user's membership
    user.membership = program._id;
    user.membershipStatus = 'active';
    await user.save();

    // Populate membership for response
    await user.populate('membership');

    res.status(200).json({
      success: true,
      message: 'Membership program selected successfully',
      data: {
        program: user.membership,
        status: user.membershipStatus,
        points: user.membershipPoints
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get available rewards for user's membership
// @route   GET /api/v1/memberships/rewards
// @access  Private
exports.getMembershipRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('membership');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.membership) {
      return res.status(404).json({ success: false, message: 'User has no active membership' });
    }

    // Get all eligible programs
    const eligiblePrograms = await getEligibleMembershipPrograms(user.membershipPoints);
    
    // Extract rewards from all eligible programs
    const availableRewards = [];
    eligiblePrograms.forEach(program => {
      program.rewards.forEach(reward => {
        if (reward.isAvailable) {
          availableRewards.push({
            reward,
            programId: program._id,
            programName: program.name
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      count: availableRewards.length,
      data: availableRewards
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Redeem a reward
// @route   POST /api/v1/memberships/rewards/redeem
// @access  Private
exports.redeemReward = async (req, res) => {
  try {
    const { programId, rewardId } = req.body;
    
    if (!programId || !rewardId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both programId and rewardId'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the program
    const program = await MembershipProgram.findById(programId);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Membership program not found' });
    }

    // Find the reward in the program
    const reward = program.rewards.id(rewardId);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found in this program' });
    }

    // Check if the reward is available
    if (!reward.isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'This reward is not currently available' 
      });
    }

    // Check if user has enough points
    if (user.membershipPoints < reward.pointsCost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not enough points to redeem this reward' 
      });
    }

    // Deduct points
    user.membershipPoints -= reward.pointsCost;

    // Store the reward data directly instead of just the ID
    // This ensures we have the complete reward data even if it's modified later
    const rewardData = {
      _id: reward._id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      isAvailable: reward.isAvailable
    };

    // Add to user's redeemed rewards
    user.redeemedRewards.push({
      reward: rewardId, // Keep this for backwards compatibility
      membershipProgram: programId,
      pointsSpent: reward.pointsCost,
      status: 'redeemed',
      rewardData: rewardData // Add the complete reward data
    });

    await user.save();

    // Check if membership tier changed due to point deduction
    const newMembershipProgram = await getMembershipProgramFromPoints(user.membershipPoints);
    if (newMembershipProgram && user.membership.toString() !== newMembershipProgram._id.toString()) {
      user.membership = newMembershipProgram._id;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      data: {
        reward: reward,
        remainingPoints: user.membershipPoints,
        redemptionStatus: 'redeemed'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user's redeemed rewards history
// @route   GET /api/v1/memberships/rewards/history
// @access  Private
exports.getRedemptionHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'redeemedRewards.membershipProgram',
        select: 'name type description'
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('User redeemed rewards:', JSON.stringify(user.redeemedRewards, null, 2));

    // We need to manually populate the rewards since they are stored as subdocuments
    const populatedRewards = [];

    // Only process if there are redeemed rewards
    if (user.redeemedRewards && user.redeemedRewards.length > 0) {
      for (const redeemedReward of user.redeemedRewards) {
        let rewardData = null;
        
        // First, check if we have the reward data directly stored (new approach)
        if (redeemedReward.rewardData) {
          rewardData = redeemedReward.rewardData;
        } else {
          // Fall back to the old approach: find the reward in the program
          try {
            const program = await MembershipProgram.findById(redeemedReward.membershipProgram._id);
            if (program) {
              rewardData = program.rewards.id(redeemedReward.reward);
            }
          } catch (err) {
            console.error('Error fetching reward from program:', err);
          }
        }
        
        // Only add to response if we have reward data
        if (rewardData) {
          populatedRewards.push({
            _id: redeemedReward._id,
            reward: rewardData,
            membershipProgram: redeemedReward.membershipProgram,
            redeemedAt: redeemedReward.redeemedAt,
            pointsSpent: redeemedReward.pointsSpent,
            status: redeemedReward.status
          });
        }
      }
    }

    console.log('Populated rewards:', JSON.stringify(populatedRewards, null, 2));

    res.status(200).json({
      success: true,
      count: populatedRewards.length,
      data: populatedRewards
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 