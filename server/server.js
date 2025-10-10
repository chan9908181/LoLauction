const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const AuctionWebSocketServer = require('./websocket/auctionWebSocket');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000; // Changed to 8000 to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with Atlas optimization and retry logic
const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/player-trading-app', {
      // MongoDB Atlas optimized options (modern driver compatible)
      serverSelectionTimeoutMS: 10000, // Increased timeout to 10s
      socketTimeoutMS: 60000, // Close sockets after 60s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain a minimum of 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
      retryWrites: true, // Retry writes automatically
    });
    
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Initialize WebSocket server AFTER database connection
    const auctionWS = new AuctionWebSocketServer(server);
    console.log('🔌 WebSocket server initialized');
    
    // Reset retry count on successful connection
    retryCount = 0;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Retry connection up to 3 times
    if (retryCount < 3) {
      console.log(`🔄 Retrying connection in 5 seconds... (Attempt ${retryCount + 1}/3)`);
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      console.error('💀 Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events with reduced logging
let isConnected = true;

mongoose.connection.on('disconnected', () => {
  if (isConnected) {
    console.log('⚠️  MongoDB disconnected - attempting to reconnect...');
    isConnected = false;
  }
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  if (!isConnected) {
    console.log('✅ MongoDB reconnected successfully');
    isConnected = true;
  }
});

mongoose.connection.on('connected', () => {
  isConnected = true;
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/rosters', require('./routes/rosters'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Player API Server is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 WebSocket server available at ws://localhost:${PORT}/auction`);
});
