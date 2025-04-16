const CoworkingSpace = require('../models/coworkingSpace');
const Equipment = require('../models/equipment'); // Import Equipment model


// @desc    Get all coworking spaces
// @route   GET /api/v1/coworking-spaces
// @access  Public
exports.getCoworkingSpaces = async (req, res, next) => {
    try {
        const coworkingSpaces = await CoworkingSpace.find();
        res.status(200).json({
            success: true,
            count: coworkingSpaces.length,
            data: coworkingSpaces
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get single coworking space
// @route   GET /api/v1/coworking-spaces/:id
// @access  Public
exports.getCoworkingSpace = async (req, res, next) => {
    try {
        const coworkingSpace = await CoworkingSpace.findById(req.params.id);
        
        if (!coworkingSpace) {
            return res.status(404).json({
                success: false,
                error: 'Coworking space not found'
            });
        }

        res.status(200).json({
            success: true,
            data: coworkingSpace
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Create coworking space
// @route   POST /api/v1/coworking-spaces
// @access  Private/Admin
exports.createCoworkingSpace = async (req, res, next) => {
    try {
        // Separate initialEquipment from the rest of the body
        const { initialEquipment, ...spaceData } = req.body;

        // Create the coworking space first
        const coworkingSpace = await CoworkingSpace.create(spaceData);

        // If initial equipment is provided, create those documents
        if (initialEquipment && Array.isArray(initialEquipment) && initialEquipment.length > 0) {
            // Add the coworkingSpace ID to each piece of equipment
            const equipmentToCreate = initialEquipment.map(equip => ({
                ...equip, // Spread the equipment data (name, description, quantityAvailable)
                coworkingSpace: coworkingSpace._id // Link to the newly created space
            }));

            try {
                // Use insertMany for efficiency
                await Equipment.insertMany(equipmentToCreate);
                console.log(`Successfully created ${equipmentToCreate.length} initial equipment items for space ${coworkingSpace.name}`);
            } catch (equipmentError) {
                console.error(`Error creating initial equipment for space ${coworkingSpace._id}:`, equipmentError);
                // Decide on error handling: 
                // 1. Just log it (as done here) - space exists, but equipment might be missing.
                // 2. Attempt to delete the created coworkingSpace for atomicity (more complex).
                // 3. Return a specific error/warning in the response.
            }
        }

        // Return success response with the created coworking space data
        res.status(201).json({
            success: true,
            data: coworkingSpace
        });

    } catch (error) {
        // Handle errors from CoworkingSpace.create or other unexpected issues
        console.error("Error creating coworking space:", error);
        // Pass to error handling middleware if available, or send specific response
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create coworking space'
        });
        // next(error); // Alternative using error middleware
    }
};

// @desc    Update coworking space
// @route   PUT /api/v1/coworking-spaces/:id
// @access  Private/Admin
exports.updateCoworkingSpace = async (req, res, next) => {
    try {
        const coworkingSpace = await CoworkingSpace.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!coworkingSpace) {
            return res.status(404).json({
                success: false,
                error: 'Coworking space not found'
            });
        }

        res.status(200).json({
            success: true,
            data: coworkingSpace
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete coworking space
// @route   DELETE /api/v1/coworking-spaces/:id
// @access  Private/Admin
exports.deleteCoworkingSpace = async (req, res, next) => {
    try {
        const coworkingSpace = await CoworkingSpace.findById(req.params.id);

        if (!coworkingSpace) {
            return res.status(404).json({
                success: false,
                error: 'Coworking space not found'
            });
        }

        await coworkingSpace.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};


// @desc    Get nearest coworking spaces based on latitude and longitude
// @route   GET /api/v1/coworking-spaces/nearest
// @access  Public
exports.getNearestCoworkingSpaces = async (req, res) => {
    
    try {
        console.log("Reached getNearestCoworkingSpaces");
        
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide latitude and longitude parameters' 
            });
        }

        // Parse coordinates to numbers
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        // Find coworking spaces with geospatial query
        const coworkingSpaces = await CoworkingSpace.find({
            coordinates: {
                $near: {
                    $geometry: { 
                        type: "Point", 
                        coordinates: [lng, lat] 
                    },
                    $maxDistance: 50000 // 50km radius
                }
            }
        });

        console.log("Query Results:", coworkingSpaces);

        if (coworkingSpaces.length === 0) {
            return res.status(404).json({ success: false, error: 'No coworking spaces found nearby.' });
        }

        res.status(200).json({
            success: true,
            count: coworkingSpaces.length,
            data: coworkingSpaces
        });

    } catch (error) {
        console.error("Detailed Error:", error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};
