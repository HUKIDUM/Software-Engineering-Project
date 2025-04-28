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
  deleteMembershipProgram
} = require('../controllers/membership');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// User membership routes - require authentication
router.get('/', protect, getMembership);
router.post('/', protect, createOrUpdateMembership);

// Admin-only routes for user memberships
router.get('/users', protect, authorize('admin'), getAllUserMemberships);

// Special routes
router.put('/points/:userId', protect, updatePoints);

// Membership program routes
router.get('/programs', getAllMembershipPrograms);
router.get('/programs/:id', getMembershipProgram);
router.post('/programs', protect, authorize('admin'), createMembershipProgram);
router.put('/programs/:id', protect, authorize('admin'), updateMembershipProgram);
router.delete('/programs/:id', protect, authorize('admin'), deleteMembershipProgram);

module.exports = router; 