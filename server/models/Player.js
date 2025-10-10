const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  startingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  tier: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  currentPrice: {
    type: Number,
    default: function() {
      return this.startingPrice;
    }
  },

  bids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  }],
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove the updateStatus method as it's no longer needed
module.exports = mongoose.model('Player', playerSchema);
