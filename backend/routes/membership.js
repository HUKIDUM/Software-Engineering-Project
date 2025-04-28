const express = require('express');
const {
  getMembership,
  createOrUpdateMembership,
  updatePoints,
  getAllUserMemberships,
  getAllMembershipPrograms,
  getMembershipProgram,
  createMembershipProgram,
  updateMembershipProgram,
  deleteMembershipProgram,
  getEligibleMemberships,
  chooseMembershipProgram,
  getMembershipRewards,
  redeemReward,
  getRedemptionHistory,
  getMembershipStats
} = require('../controllers/membership');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// User membership routes - require authentication
router.get('/', protect, getMembership);
router.post('/', protect, createOrUpdateMembership);

// Eligible memberships and selection
router.get('/eligible', protect, getEligibleMemberships);
router.post('/choose/:programId', protect, chooseMembershipProgram);

// Rewards routes
router.get('/rewards', protect, getMembershipRewards);
router.post('/rewards/redeem', protect, redeemReward);
router.get('/rewards/history', protect, getRedemptionHistory);

// Admin-only routes for user memberships
router.get('/users', protect, authorize('admin'), getAllUserMemberships);

// Admin-only route for membership statistics
router.get('/stats', protect, authorize('admin'), getMembershipStats);

// Special routes
router.put('/points/:userId', protect, updatePoints);

// Membership program routes
router.get('/programs', getAllMembershipPrograms);
router.get('/programs/:id', getMembershipProgram);
router.post('/programs', protect, authorize('admin'), createMembershipProgram);
router.put('/programs/:id', protect, authorize('admin'), updateMembershipProgram);
router.delete('/programs/:id', protect, authorize('admin'), deleteMembershipProgram);

module.exports = router; 