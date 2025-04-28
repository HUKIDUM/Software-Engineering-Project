const express = require('express');
const { getMenuItems } = require('../controllers/menuController');

const router = express.Router();

// Route for GET /api/v1/menu
router.route('/').get(getMenuItems);

module.exports = router; 