const express = require('express');
const {
    getEquipments,
    getEquipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
} = require('../controllers/equipment');

const Equipment = require('../models/equipment');

// Import middleware
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Routes for equipment management
router.route('/')
    .get(advancedResults(Equipment, {
        path: 'coworkingSpace',
        select: 'name description'
    }), getEquipments)
    .post(protect, addEquipment);

router.route('/:id')
    .get(getEquipment)
    .put(protect, updateEquipment)
    .delete(protect, deleteEquipment);

// Route to fetch customer's equipment requests

module.exports = router;