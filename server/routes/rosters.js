const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Coach = require('../models/Coach');
const auth = require('../middleware/auth');

// Get all team rosters - simple approach
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching team rosters from database...');
    
    // Get all coaches with their points
    const coaches = await Coach.find({}).select('name username points');
    console.log(`Found ${coaches.length} coaches`);
    
    // Get all players that have been bought (have a buyer)
    const soldPlayers = await Player.find({ buyer: { $ne: null } }).populate('buyer', 'name username');
    console.log(`Found ${soldPlayers.length} sold players`);
    
    // Build rosters object
    const rosters = {};
    const coachDetails = [];
    
    // Initialize rosters for all coaches
    coaches.forEach(coach => {
      const coachFullName = coach.name;
      rosters[coachFullName] = {
        TOP: null,
        JGL: null,
        MID: {
          // Coach is their own MID player
          _id: coach._id,
          name: coachFullName,
          description: `Team captain and mid laner`,
          tier: 'Coach',
          position: 'MID',
          currentPrice: 0,
          startingPrice: 0
        },
        ADC: null,
        SUPP: null
      };
      
      coachDetails.push({
        name: coachFullName,
        username: coach.username,
        points: coach.points
      });
    });
    
    // Fill rosters with bought players (excluding MID since coaches are MID)
    soldPlayers.forEach(player => {
      if (player.buyer && player.position !== 'MID') {
        const coachFullName = player.buyer.name;
        console.log(`Assigning ${player.name} (${player.position}) to ${coachFullName} for $${player.currentPrice}`);
        
        if (rosters[coachFullName]) {
          rosters[coachFullName][player.position] = {
            _id: player._id,
            name: player.name,
            description: player.description,
            tier: player.tier,
            position: player.position,
            currentPrice: player.currentPrice,
            startingPrice: player.startingPrice
          };
        }
      }
    });
    
    console.log('Final rosters with coaches as MID:', JSON.stringify(rosters, null, 2));
    console.log('Coach details:', coachDetails);
    
    res.json({
      rosters,
      coachDetails,
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ 
      message: 'Error fetching team rosters', 
      error: error.message 
    });
  }
});

module.exports = router;
