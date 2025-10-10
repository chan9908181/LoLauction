const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    default: 1000,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Removed password hashing middleware - using plain text passwords

module.exports = mongoose.model('Coach', coachSchema);
