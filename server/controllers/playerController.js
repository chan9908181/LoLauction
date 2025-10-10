const Player = require('../models/Player');
const Bid = require('../models/Bid');

const playerController = {
  // Get all players
  getAllPlayers: async (req, res) => {
    try {
      const players = await Player.find()
        .populate('buyer', 'username name')
        .populate({
          path: 'bids',
          populate: {
            path: 'bidder',
            select: 'username name'
          }
        })
        .sort({ createdAt: -1 });

      res.json(players);
    } catch (error) {
      console.error('Get players error:', error);
      res.status(500).json({ message: 'Server error while fetching players' });
    }
  },

  // Get player by ID
  getPlayerById: async (req, res) => {
    try {
      const player = await Player.findById(req.params.id)
        .populate('buyer', 'username name')
        .populate({
          path: 'bids',
          populate: {
            path: 'bidder',
            select: 'username name'
          }
        });

      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      res.json(player);
    } catch (error) {
      console.error('Get player by ID error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while fetching player' });
    }
  },

  // Create new player
  createPlayer: async (req, res) => {
    try {
      const { name, description, tier, position } = req.body;

      if (!name || !description) {
        return res.status(400).json({ 
          message: 'Name and description are required' 
        });
      }

      if (!tier) {
        return res.status(400).json({ 
          message: 'Tier is required' 
        });
      }

      if (!position) {
        return res.status(400).json({ 
          message: 'Position is required' 
        });
      }

      // Accept any tier value without validation
      let normalizedTier = tier.trim();

      // Validate position - support CSV format: Top, Jungle, Mid, ADC, Support
      const validCSVPositions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
      const validSimplePositions = ['TOP', 'JGL', 'MID', 'ADC', 'SUPP'];
      
      let normalizedPosition = position.toUpperCase();
      
      // Map CSV position names to simple format for database storage
      const positionMap = {
        'TOP': 'TOP',
        'JUNGLE': 'JGL', 
        'MID': 'MID',
        'ADC': 'ADC',
        'SUPPORT': 'SUPP'
      };
      
      if (!validCSVPositions.includes(normalizedPosition)) {
        return res.status(400).json({ 
          message: `Position must be one of: Top, Jungle, Mid, ADC, Support` 
        });
      }
      
      normalizedPosition = positionMap[normalizedPosition];

      const player = new Player({
        name,
        description,
        tier: normalizedTier,
        position: normalizedPosition,
        startingPrice: 0,
        currentPrice: 0
      });

      await player.save();

      res.status(201).json({
        message: 'Player created successfully',
        player
      });
    } catch (error) {
      console.error('Create player error:', error);
      res.status(500).json({ message: 'Server error while creating player' });
    }
  },

  // Update player
  updatePlayer: async (req, res) => {
    try {
      const { name, description } = req.body;
      const player = await Player.findById(req.params.id);

      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Update fields if provided
      if (name) player.name = name;
      if (description) player.description = description;

      await player.save();

      res.json({
        message: 'Player updated successfully',
        player
      });
    } catch (error) {
      console.error('Update player error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while updating player' });
    }
  },

  // Import players from CSV data
  importPlayers: async (req, res) => {
    try {
      const { players } = req.body;
      console.log('Received players data:', JSON.stringify(players.slice(0, 3), null, 2)); // Debug first 3 players

      if (!players || !Array.isArray(players) || players.length === 0) {
        return res.status(400).json({ 
          message: 'Players array is required and must not be empty' 
        });
      }

      // Validate each player
      const validationErrors = [];
      const validPlayers = [];

      players.forEach((player, index) => {
        const { name, description, tier, position } = player;
        
        console.log(`Validating player ${index + 1}: name="${name}", tier="${tier}", position="${position}"`);
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          validationErrors.push(`Row ${index + 1}: Name is required`);
          return;
        }
        
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
          validationErrors.push(`Row ${index + 1}: Description is required`);
          return;
        }
        
        if (!tier || typeof tier !== 'string' || tier.trim().length === 0) {
          validationErrors.push(`Row ${index + 1}: Tier is required`);
          return;
        }
        
        if (!position || typeof position !== 'string' || position.trim().length === 0) {
          validationErrors.push(`Row ${index + 1}: Position is required`);
          return;
        }

        // Accept any tier value without validation
        let normalizedTier = tier.trim();

        // Check if position is valid - support CSV format: Top, Jungle, Mid, ADC, Support
        const validCSVPositions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
        const validSimplePositions = ['TOP', 'JGL', 'MID', 'ADC', 'SUPP'];
        
        let normalizedPosition = position.toUpperCase();
        
        // Map CSV position names to simple format for database storage
        const positionMap = {
          'TOP': 'TOP',
          'JUNGLE': 'JGL', 
          'MID': 'MID',
          'ADC': 'ADC',
          'SUPPORT': 'SUPP'
        };
        
        if (!validCSVPositions.includes(normalizedPosition)) {
          validationErrors.push(`Row ${index + 1}: Position must be one of: Top, Jungle, Mid, ADC, Support`);
          return;
        }
        
        normalizedPosition = positionMap[normalizedPosition];

        validPlayers.push({
          name: name.trim(),
          description: description.trim(),
          tier: normalizedTier,
          position: normalizedPosition,
          startingPrice: 0,
          currentPrice: 0
        });
      });

      if (validationErrors.length > 0) {
        console.log('Validation errors found:', validationErrors);
        return res.status(400).json({ 
          message: 'Validation errors found',
          errors: validationErrors
        });
      }

      console.log(`Successfully validated ${validPlayers.length} players`);
      
      // Import all players
      const createdPlayers = await Player.insertMany(validPlayers);

      res.status(201).json({
        message: `Successfully imported ${createdPlayers.length} players`,
        count: createdPlayers.length,
        players: createdPlayers
      });
    } catch (error) {
      console.error('Import players error:', error);
      res.status(500).json({ message: 'Server error while importing players' });
    }
  },

  // Delete player
  deletePlayer: async (req, res) => {
    try {
      const player = await Player.findById(req.params.id);

      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Also delete associated bids
      await Bid.deleteMany({ player: player._id });
      await Player.findByIdAndDelete(req.params.id);

      res.json({ message: 'Player and associated bids deleted successfully' });
    } catch (error) {
      console.error('Delete player error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid player ID' });
      }
      res.status(500).json({ message: 'Server error while deleting player' });
    }
  }
};

module.exports = playerController;
