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

// @desc    Get a single menu item by ID
// @route   GET /api/v1/menu/:id
// @access  Private/Admin
exports.getMenuItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const menuItem = await MenuItem.findById(id);
        
        if (!menuItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        
        res.status(200).json({ success: true, data: menuItem });
    } catch (err) {
        console.error('Error fetching menu item:', err);
        res.status(500).json({ success: false, message: 'Server Error fetching menu item' });
    }
};

// @desc    Add a new menu item (Admin only)
// @route   POST /api/v1/menu
// @access  Private/Admin
exports.createMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, isAvailable } = req.body;
        const newItem = await MenuItem.create({ name, description, price, category, isAvailable });
        res.status(201).json({ success: true, data: newItem });
    } catch (err) {
        console.error('Error creating menu item:', err);
        res.status(500).json({ success: false, message: 'Server Error creating menu item' });
    }
};

// @desc    Update a menu item (Admin only)
// @route   PUT /api/v1/menu/:id
// @access  Private/Admin
exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedItem = await MenuItem.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!updatedItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        res.status(200).json({ success: true, data: updatedItem });
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ success: false, message: 'Server Error updating menu item' });
    }
};

// @desc    Delete a menu item (Admin only)
// @route   DELETE /api/v1/menu/:id
// @access  Private/Admin
exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await MenuItem.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        res.status(200).json({ success: true, message: 'Menu item deleted' });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ success: false, message: 'Server Error deleting menu item' });
    }
}; 