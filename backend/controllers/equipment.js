const Equipment = require('../models/equipment');
const CoworkingSpace = require('../models/coworkingSpace');
const EquipmentRequest = require('../models/EquipmentRequest');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all equipment, optionally filtered by coworking space
// @route   GET /api/v1/equipment
// @route   GET /api/v1/coworkingspaces/:coworkingSpaceId/equipment
// @access  Public
exports.getCustomerEquipmentRequests = asyncHandler(async (req, res, next) => {
    const { customerId } = req.params;

    const equipmentRequests = await EquipmentRequest.find({ customerId });

    if (!equipmentRequests.length) {
        return next(new ErrorResponse('No equipment requests found for this customer.', 404));
    }

    res.status(200).json({
        success: true,
        data: equipmentRequests
    });
});

exports.getEquipments = asyncHandler(async (req, res, next) => {
    let query;

    if (req.params.coworkingSpaceId) {
        // Check if coworking space exists
        const space = await CoworkingSpace.findById(req.params.coworkingSpaceId);
        if (!space) {
            return next(
                new ErrorResponse(`Coworking space not found with id of ${req.params.coworkingSpaceId}`, 404)
            );
        }
        query = Equipment.find({ coworkingSpace: req.params.coworkingSpaceId });
    } else {
        query = Equipment.find().populate({
            path: 'coworkingSpace',
            select: 'name description' // Select fields you want to show from coworking space
        });
    }

    try {
        const equipments = await query;

        res.status(200).json({
            success: true,
            count: equipments.length,
            data: equipments
        });
    } catch (err) {
        console.error(err.stack);
        return next(new ErrorResponse('Server Error', 500));
    }
});

// @desc    Get single equipment
// @route   GET /api/v1/equipment/:id
// @access  Public
exports.getEquipment = asyncHandler(async (req, res, next) => {
    const equipment = await Equipment.findById(req.params.id).populate({
        path: 'coworkingSpace',
        select: 'name description'
    });

    if (!equipment) {
        return next(
            new ErrorResponse(`Equipment not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: equipment
    });
});

// @desc    Add new equipment
// @route   POST /api/v1/coworkingspaces/:coworkingSpaceId/equipment
// @access  Private (Admin/Owner of the coworking space)
exports.addEquipment = asyncHandler(async (req, res, next) => {
    req.body.coworkingSpace = req.params.coworkingSpaceId;
    // Add user ID if needed for ownership/creator tracking
    // req.body.user = req.user.id;

    // Check if coworking space exists
    const space = await CoworkingSpace.findById(req.params.coworkingSpaceId);
    if (!space) {
        return next(
            new ErrorResponse(`Coworking space not found with id of ${req.params.coworkingSpaceId}`, 404)
        );
    }

    // Add logic here to check if the user is authorized to add equipment to this space
    // For example, check if req.user.id matches space.owner or if user has 'admin' role

    const equipment = await Equipment.create(req.body);

    res.status(201).json({
        success: true,
        data: equipment
    });
});

// @desc    Update equipment
// @route   PUT /api/v1/equipment/:id
// @access  Private (Admin/Owner)
exports.updateEquipment = asyncHandler(async (req, res, next) => {
    let equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
        return next(
            new ErrorResponse(`Equipment not found with id of ${req.params.id}`, 404)
        );
    }

    // Add authorization check: Ensure user is equipment owner or admin

    equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: equipment
    });
});

// @desc    Delete equipment
// @route   DELETE /api/v1/equipment/:id
// @access  Private (Admin/Owner)
exports.deleteEquipment = asyncHandler(async (req, res, next) => {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
        return next(
            new ErrorResponse(`Equipment not found with id of ${req.params.id}`, 404)
        );
    }

    // Add authorization check: Ensure user is equipment owner or admin

    await equipment.deleteOne(); // Use deleteOne() in Mongoose 6+

    res.status(200).json({
        success: true,
        data: {}
    });
}); 