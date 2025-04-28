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

    res.status(200).json({
      success: true,
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