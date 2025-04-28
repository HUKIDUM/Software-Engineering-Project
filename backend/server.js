const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const {xss} = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cron = require('node-cron');
const { updatePastReservations } = require('./utils/schedulerTasks');

// --- Socket.IO Setup ---
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io
// --- End Socket.IO Setup ---

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // Remove deprecated options
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};
connectDB();

const app = express();

// --- Socket.IO Server Creation ---
const httpServer = http.createServer(app);
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://software-dev-2.vercel.app', 'http://localhost:3000', 'http://localhost:3001']
    : ['http://localhost:3000', 'http://localhost:3001'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"], // Typically GET/POST are sufficient for socket communication setup
    credentials: true
  }
});
// --- End Socket.IO Server Creation ---

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Attach io instance to app for access in controllers/routes if needed (alternative to exporting)
app.set('io', io);

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
const coworkingSpaceRoutes = require('./routes/coworkingSpace');
const equipmentRoutes = require('./routes/equipment');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const membershipRoutes = require('./routes/membership');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/coworking-spaces', coworkingSpaceRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/memberships', membershipRoutes);

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  // Handle other socket events here if needed
  // e.g., socket.join('some-room');
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});
// --- End Socket.IO Connection Handling ---

// Schedule Tasks
// Runs every hour at the beginning of the hour (e.g., 1:00, 2:00)
console.log('[Scheduler] Scheduling updatePastReservations task...');
cron.schedule('0 * * * *', () => {
  console.log('[Scheduler] Triggering scheduled task: updatePastReservations');
  updatePastReservations().catch(err => {
    console.error('[Scheduler] Error during scheduled execution of updatePastReservations:', err);
  });
});

// Test Routes to check server functionality
app.get('/', (req, res) => {
    res.json({ success: true, message: 'API is running' });
});

app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test route works!' });
});

// Start Server only if not in test environment
const PORT = process.env.PORT || 5003;
let serverInstance; 

if (process.env.NODE_ENV !== 'test') {
    // Use httpServer to listen now
    serverInstance = httpServer.listen(PORT, () => { 
        console.log(`🚀 Server (with Socket.IO) running on port ${PORT}`);
    });
} 

process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Unhandled Error: ${err.message}`);
    if (serverInstance) {
         serverInstance.close(() => process.exit(1));
    } else {
        process.exit(1); 
    }
});

// Export app (supertest uses this)
// Export io separately if needed in other modules (e.g., for direct emitting outside req cycle)
module.exports = { app, io, httpServer }; // Export app, io, and httpServer
