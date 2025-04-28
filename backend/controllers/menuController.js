const MenuItem = require('../models/MenuItem');

// @desc    Get all available menu items
// @route   GET /api/v1/menu
// @access  Public
exports.getMenuItems = async (req, res, next) => {
    try {
        // Fetch only items where isAvailable is true
        // Select only the fields required by the frontend/API contract
        const menuItems = await MenuItem.find({ isAvailable: true })
                                        .select('_id name description price category'); // Explicitly select fields

        // Return an empty array if no items found, rather than null or undefined
        res.status(200).json(menuItems || []); 
    } catch (err) {
        console.error('Error fetching menu items:', err);
        // Pass error to a central error handler if available, otherwise send generic error
        res.status(500).json({ success: false, message: 'Server Error fetching menu items' });
        // next(err); // Use if you have error handling middleware
    }
}; 