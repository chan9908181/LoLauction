
const jwt = require('jsonwebtoken');
const Coach = require('../models/Coach');
const Admin = require('../models/Admin');

// Generate JWT Token
const generateToken = (userId, username, userType) => {
  return jwt.sign(
    { userId, username, userType },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Register a new user
const register = async (req, res) => {
  try {
    const { username, password, name, isAdmin } = req.body;

    // Validate required fields
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and name are required'
      });
    }

    // Check if user already exists in either collection
    const existingAdmin = await Admin.findOne({ username });
    const existingCoach = await Coach.findOne({ username });
    
    if (existingAdmin || existingCoach) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    let newUser;
    if (isAdmin) {
      newUser = new Admin({ username, password, name });
    } else {
      newUser = new Coach({ username, password, name });
    }

    await newUser.save();

    const token = generateToken(newUser._id, newUser.username, isAdmin ? 'admin' : 'coach');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        userType: isAdmin ? 'admin' : 'coach',
        points: isAdmin ? undefined : newUser.points
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check both Admin and Coach collections
    let user = await Admin.findOne({ username });
    let userType = 'admin';
    
    if (!user) {
      user = await Coach.findOne({ username });
      userType = 'coach';
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password (plain text comparison)
    if (password !== user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, user.username, userType);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        userType,
        points: userType === 'coach' ? user.points : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    let user;
    
    // Check if it's an admin first
    if (req.user.userType === 'admin') {
      user = await Admin.findById(req.user.userId).select('-password');
    } else {
      user = await Coach.findById(req.user.userId).select('-password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        userType: req.user.userType,
        points: req.user.userType === 'coach' ? user.points : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout coach (optional - mainly for token blacklisting if implemented)
const logout = async (req, res) => {
  try {
    // In a JWT system, logout is usually handled client-side by removing the token
    // But you can implement token blacklisting here if needed
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout
};
