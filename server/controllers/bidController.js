const Bid = require('../models/Bid');
const Player = require('../models/Player');

const bidController = {
  // Create a bid (raise by $10)
  createBid: async (req, res) => {
    try {
      const { playerId } = req.body;
      const bidderId = req.user.userId;

      if (!playerId) {
        return res.status(400).json({ message: 'Player ID is required' });
      }

      // Find the player
      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Check if player already has a buyer
      if (player.buyer) {
        return res.status(400).json({ 
          message: 'This player has already been sold' 
        });
      }

      // Calculate new bid amount (current price + $10)
      const newBidAmount = player.currentPrice + 10;

      // Create the bid
      const bid = new Bid({
        player: playerId,
        bidder: bidderId,
        amount: newBidAmount
      });

      await bid.save();

      // Update player's current price and add bid to bids array
      player.currentPrice = newBidAmount;
      player.bids.push(bid._id);
      await player.save();

      // Populate the bid with bidder info for response
      await bid.populate('bidder', 'username firstName lastName');
      await bid.populate('player', 'name description');

      res.status(201).json({
        message: 'Bid placed successfully',
        bid,
        newPrice: newBidAmount
      });
    } catch (error) {
      console.error('Create bid error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while placing bid' });
    }
  },

  // Get all bids for a specific player
  getBidsByPlayer: async (req, res) => {
    try {
      const { playerId } = req.params;

      const bids = await Bid.find({ player: playerId })
        .populate('bidder', 'username firstName lastName')
        .sort({ createdAt: -1 });

      res.json(bids);
    } catch (error) {
      console.error('Get bids by player error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while fetching bids' });
    }
  },

  // Get all bids by a specific user
  getBidsByUser: async (req, res) => {
    try {
      const userId = req.user.userId;

      const bids = await Bid.find({ bidder: userId })
        .populate('player', 'name description currentPrice')
        .sort({ createdAt: -1 });

      res.json(bids);
    } catch (error) {
      console.error('Get bids by user error:', error);
      res.status(500).json({ message: 'Server error while fetching user bids' });
    }
  },

  // Get all bids (admin functionality)
  getAllBids: async (req, res) => {
    try {
      const bids = await Bid.find()
        .populate('bidder', 'username firstName lastName')
        .populate('player', 'name description')
        .sort({ createdAt: -1 });

      res.json(bids);
    } catch (error) {
      console.error('Get all bids error:', error);
      res.status(500).json({ message: 'Server error while fetching all bids' });
    }
  },

  // Buy a player (highest bidder wins)
  buyPlayer: async (req, res) => {
    try {
      const { playerId } = req.body;
      const buyerId = req.user.userId;

      if (!playerId) {
        return res.status(400).json({ message: 'Player ID is required' });
      }

      // Find the player
      const player = await Player.findById(playerId)
        .populate('bids')
        .populate('buyer', 'username firstName lastName');

      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Check if player already has a buyer
      if (player.buyer) {
        return res.status(400).json({ 
          message: 'This player has already been sold' 
        });
      }

      // Check if there are any bids
      if (player.bids.length === 0) {
        return res.status(400).json({ 
          message: 'No bids have been placed for this player' 
        });
      }

      // Find the highest bid
      const highestBid = await Bid.findOne({ player: playerId })
        .sort({ amount: -1 })
        .populate('bidder');

      // Check if the current user is the highest bidder
      if (highestBid.bidder._id.toString() !== buyerId) {
        return res.status(403).json({ 
          message: 'Only the highest bidder can buy this player' 
        });
      }

      // Set the buyer
      player.buyer = buyerId;
      await player.save();

      // Populate buyer info for response
      await player.populate('buyer', 'username firstName lastName');

      res.json({
        message: 'Player purchased successfully',
        player,
        finalPrice: player.currentPrice
      });
    } catch (error) {
      console.error('Buy player error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while purchasing player' });
    }
  }
};

module.exports = bidController;
