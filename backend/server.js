const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const {xss} = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://software-dev-2.vercel.app', 'http://localhost:3000', 'http://localhost:3001']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

//Sanitize data
app.use(mongoSanitize());

//Set security headers
app.use(helmet());

//Prevent XSS attacks
app.use(xss());

//Rate limiting
const limiter = rateLimit({
    windowMs: 1*60*1000, //1 mins
    max: 10000
});
app.use(limiter);

// Import Routes
const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservation');


// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reservations', reservationRoutes);

const coworkingSpaceRoutes = require('./routes/coworkingSpace');
app.use('/api/v1/coworking-spaces', coworkingSpaceRoutes);  // Mounting the coworking space routes



// Test Routes to check server functionality
app.get('/', (req, res) => {
    res.json({ success: true, message: 'API is running' });
});

app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test route works!' });
});

// Start Server
const PORT = process.env.PORT || 5003;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Unhandled Error: ${err.message}`);
    server.close(() => process.exit(1));
});

// Export the Express API for Vercel serverless deployment
module.exports = app;
