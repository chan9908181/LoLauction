const jwt = require('jsonwebtoken');
const Coach = require('../models/Coach');
const Admin = require('../models/Admin');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user exists in either Admin or Coach collection
    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.userId).select('-password');
    } else {
      user = await Coach.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      userType: decoded.userType
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
