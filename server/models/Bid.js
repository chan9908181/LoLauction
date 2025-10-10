const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Ensure bid amount is higher than current price
bidSchema.pre('save', async function(next) {
  try {
    const Player = mongoose.model('Player');
    const player = await Player.findById(this.player);
    
    if (!player) {
      throw new Error('Player not found');
    }
    
    if (this.amount <= player.currentPrice) {
      throw new Error('Bid must be higher than current price');
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Bid', bidSchema);
