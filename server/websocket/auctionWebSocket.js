const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Coach = require('../models/Coach');
const Admin = require('../models/Admin');
const Player = require('../models/Player');

class AuctionWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/auction'
    });
    
    this.connectedCoaches = new Map(); // Map<coachId, {ws, coachInfo}>
    this.auctionState = {
      status: 'waiting', // 'waiting' | 'started'
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      timeRemaining: 10,
      isActive: false
    };
    this.auctionTimer = null;

    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection attempt');
      
      // Extract token from query params
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('No token provided, closing connection');
        ws.close(1008, 'No token provided');
        return;
      }

      // Verify token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Store coach info with the connection
        ws.coachId = decoded.userId;
        ws.isAuthenticated = true;
        
        console.log(`Coach ${decoded.userId} connected to auction`);
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Successfully connected to auction',
          auctionState: this.auctionState
        }));

      } catch (error) {
        console.log('Invalid token, closing connection');
        ws.close(1008, 'Invalid token');
        return;
      }

      // Handle incoming messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        if (ws.coachId) {
          console.log(`Coach ${ws.coachId} disconnected from auction`);
          this.connectedCoaches.delete(ws.coachId);
          this.broadcastConnectedCoaches();
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('WebSocket server setup complete on /auction');
  }

  async handleMessage(ws, data) {
    console.log('Received message:', data);

    switch (data.type) {
      case 'join':
        this.handleJoin(ws, data);
        break;
      case 'leave':
        this.handleLeave(ws, data);
        break;
      case 'admin_status_request':
        console.log('Admin requesting fresh status update...');
        await this.broadcastConnectedCoaches();
        break;
      case 'started':
        this.handleAuctionStart(ws, data);
        break;
      case 'draw_player':
        this.handlePlayerDraw(ws, data);
        break;
      case 'place_bid':
        this.handleBid(ws, data);
        break;
      case 'end_auction':
        this.handleEndAuction(ws, data);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  async handleJoin(ws, data) {
    console.log('Received join message:', data);
    console.log('Coach name from message:', JSON.stringify(data.coachName), 'Length:', data.coachName ? data.coachName.length : 'undefined');
    
    if (!ws.isAuthenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    console.log(`Looking up user with ID: ${ws.coachId}`);
    
    // Check if user is admin or coach
    let user = await Admin.findById(ws.coachId);
    let userType = 'admin';
    
    if (!user) {
      user = await Coach.findById(ws.coachId);
      userType = 'coach';
    }

    if (!user) {
      console.log(`User not found for ID: ${ws.coachId}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'User not found'
      }));
      return;
    }

    console.log(`Found ${userType}: ${user.name} with username: '${user.username}'`);

    // Check if this is an admin based on data.isAdmin flag or userType
    const isAdminUser = userType === 'admin' || data.isAdmin === true || user.username === 'admin';
    
    if (isAdminUser) {
      console.log(`ADMIN USER DETECTED: ${data.coachName} - NOT adding to coach list`);
      // Store admin connection but mark as admin
      this.connectedCoaches.set(ws.coachId, {
        ws: ws,
        coachId: ws.coachId,
        coachName: data.coachName,
        username: user.username,
        userType: 'admin', // Force admin type
        isAdmin: true,
        joinedAt: new Date()
      });
    } else {
      console.log(`COACH USER DETECTED: ${data.coachName} - Adding to coach list`);
      console.log(`Database coach name: "${user.name}" vs Frontend coach name: "${data.coachName}"`);
      // Store coach connection
      this.connectedCoaches.set(ws.coachId, {
        ws: ws,
        coachId: ws.coachId,
        coachName: data.coachName,
        username: user.username,
        userType: 'coach',
        isAdmin: false,
        joinedAt: new Date()
      });
    }

    console.log(`${userType.charAt(0).toUpperCase() + userType.slice(1)} ${data.coachName} (ID: ${ws.coachId}, Username: '${user.username}') joined the auction`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'joined',
      message: `Welcome to the auction, ${data.coachName}!`,
      auctionState: this.auctionState
    }));

    // Broadcast updated coach list (excluding admins)
    this.broadcastConnectedCoaches();
  }

  handleLeave(ws, data) {
    if (ws.coachId) {
      const coachInfo = this.connectedCoaches.get(ws.coachId);
      if (coachInfo) {
        console.log(`Coach ${coachInfo.coachName} left the auction`);
        this.connectedCoaches.delete(ws.coachId);
        this.broadcastConnectedCoaches();
      }
    }
    ws.close();
  }

  handleAuctionStart(ws, data) {
    if (!ws.isAuthenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    // Check if the sender is an admin (you might want to add admin role checking here)
    const coachInfo = this.connectedCoaches.get(ws.coachId);
    if (!coachInfo) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Coach not found in connected list'
      }));
      return;
    }

    // Update auction state
    this.auctionState.status = 'started';
    this.auctionState.startedAt = new Date();
    this.auctionState.startedBy = coachInfo.coachName;

    console.log(`Auction started by ${coachInfo.coachName}`);

    // Broadcast auction start to all connected coaches
    this.broadcastToAll({
      type: 'auction_started',
      message: 'The auction has started!',
      startedBy: coachInfo.coachName,
      startedAt: this.auctionState.startedAt,
      auctionState: this.auctionState,
      redirect: '/auctionStart'
    });

    // Send confirmation to admin
    ws.send(JSON.stringify({
      type: 'auction_start_confirmed',
      message: 'Auction started successfully',
      auctionState: this.auctionState,
      redirect: '/auctionStart'
    }));
  }

  async checkAndAutoAssignPlayer(player) {
    try {
      console.log(`===== CHECKING AUTO-ASSIGNMENT FOR ${player.name} (${player.position}) =====`);
      
      // Skip auto-assignment for MID players (coaches are MID)
      if (player.position === 'MID') {
        console.log('Skipping auto-assignment for MID position (coaches are MID)');
        return false;
      }

      // Count remaining players in this position (excluding those already bought)
      const remainingPlayersInPosition = await Player.countDocuments({
        position: player.position,
        buyer: null // Only count players that haven't been bought yet
      });

      console.log(`Remaining players in ${player.position} position: ${remainingPlayersInPosition}`);

      // If this is not the last player in the position, proceed with normal auction
      if (remainingPlayersInPosition > 1) {
        console.log('Multiple players remain in this position, proceeding with auction');
        return false;
      }

      console.log('This is the LAST player in this position! Checking for auto-assignment...');

      // Find coaches who don't have this position filled yet
      const coachesWithoutPosition = await Coach.find({});
      const eligibleCoaches = [];

      for (const coach of coachesWithoutPosition) {
        // Check if coach already has a player in this position
        const hasPlayerInPosition = await Player.findOne({
          buyer: coach._id,
          position: player.position
        });

        if (!hasPlayerInPosition) {
          eligibleCoaches.push(coach);
          console.log(`Coach ${coach.name} needs a ${player.position} player`);
        } else {
          console.log(`Coach ${coach.name} already has ${hasPlayerInPosition.name} in ${player.position}`);
        }
      }

      console.log(`Found ${eligibleCoaches.length} coaches needing ${player.position} position`);

      // If exactly one coach needs this position, auto-assign for 0 points
      if (eligibleCoaches.length === 1) {
        const assignedCoach = eligibleCoaches[0];
        console.log(`AUTO-ASSIGNING ${player.name} to ${assignedCoach.name} for 0 points`);

        // Update player with the assigned coach
        const updatedPlayer = await Player.findByIdAndUpdate(player._id, {
          buyer: assignedCoach._id,
          currentPrice: 0 // Free assignment
        }, { new: true });

        console.log('Updated player in database:', updatedPlayer);

        // Create the assigned player object for broadcast
        const assignedPlayer = {
          ...player,
          currentPrice: 0,
          buyer: assignedCoach._id
        };

        // Broadcast the auto-assignment to all clients
        this.broadcastToAll({
          type: 'player_auto_assigned',
          player: assignedPlayer,
          assignedTo: assignedCoach.name,
          assignedToUsername: assignedCoach.username,
          reason: `Last ${player.position} player automatically assigned`,
          message: `${player.name} has been automatically assigned to ${assignedCoach.name} (last ${player.position} player)`
        });

        // Also broadcast updated coach status to refresh rosters
        setTimeout(() => {
          this.broadcastConnectedCoaches();
        }, 100);

        console.log(`✅ AUTO-ASSIGNMENT COMPLETED: ${player.name} → ${assignedCoach.name} (0 points)`);
        return true; // Player was auto-assigned
      } 
      
      // If no coaches need this position, proceed with auction anyway
      if (eligibleCoaches.length === 0) {
        console.log('No coaches need this position, proceeding with auction');
        return false;
      }

      // If multiple coaches need this position, proceed with auction
      console.log(`Multiple coaches (${eligibleCoaches.length}) need this position, proceeding with auction`);
      return false;

    } catch (error) {
      console.error('ERROR in checkAndAutoAssignPlayer:', error);
      return false; // Proceed with auction if there's an error
    }
  }

  async handlePlayerDraw(ws, data) {
    console.log('===== HANDLE PLAYER DRAW START =====');
    try {
      if (!ws.isAuthenticated) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }

      console.log('Authentication check passed');

      // Check if there's already an active auction
      if (this.auctionState.isActive) {
        console.log('Auction already active, sending error');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Auction already in progress'
        }));
        return;
      }

      console.log('Active auction check passed');

      const player = data.player;
      console.log('Drawing player for auction:', player.name, 'Position:', player.position);

      // Check for auto-assignment before starting auction
      const autoAssigned = await this.checkAndAutoAssignPlayer(player);
      if (autoAssigned) {
        console.log('Player auto-assigned, skipping auction');
        return;
      }

      // Update auction state
      this.auctionState.currentPlayer = player;
      this.auctionState.currentBid = player.startingPrice || 0;
      this.auctionState.highestBidder = null;
      this.auctionState.timeRemaining = 10;
      this.auctionState.isActive = true;

      console.log('Auction state after player draw:', {
        timeRemaining: this.auctionState.timeRemaining,
        isActive: this.auctionState.isActive,
        playerName: this.auctionState.currentPlayer.name
      });

      // Start the auction timer
      console.log('About to start auction timer...');
      this.startAuctionTimer();
      console.log('Auction timer started');

      // Broadcast to all connected coaches
      console.log(`Broadcasting player_drawn to ${this.connectedCoaches.size} coaches`);
      const broadcastData = {
        type: 'player_drawn',
        player: player,
        auctionState: this.auctionState
      };
      console.log('===== DETAILED BROADCAST DEBUG =====');
      console.log('Raw auction state timeRemaining:', this.auctionState.timeRemaining);
      console.log('Broadcast data timeRemaining:', broadcastData.auctionState.timeRemaining);
      console.log('Full auction state:', JSON.stringify(this.auctionState, null, 2));
      console.log('Full broadcast data:', JSON.stringify(broadcastData, null, 2));
      console.log('====================================');
      
      console.log('About to broadcast...');
      this.broadcastToAll(broadcastData);
      console.log('Broadcast completed');
      
    } catch (error) {
      console.error('ERROR in handlePlayerDraw:', error);
      console.error('Error stack:', error.stack);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to draw player'
      }));
    }
    console.log('===== HANDLE PLAYER DRAW END =====');
  }

  async handleBid(ws, data) {
    if (!ws.isAuthenticated || !this.auctionState.isActive) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'No active auction'
      }));
      return;
    }

    const { amount, playerId, bidder } = data;

    // Validate bid
    if (amount <= this.auctionState.currentBid) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Bid must be higher than current bid'
      }));
      return;
    }

    // Check if coach has enough points and validate position
    try {
      const coach = await Coach.findOne({ username: bidder });
      if (!coach) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Coach not found'
        }));
        return;
      }

      if (amount > coach.points) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Insufficient points'
        }));
        return;
      }

      // Check if coach already has a player in this position
      const currentPlayer = this.auctionState.currentPlayer;
      if (!currentPlayer) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'No current player in auction'
        }));
        return;
      }

      const playerPosition = currentPlayer.position;
      console.log(`Checking position restriction for ${bidder}: player position is ${playerPosition}`);

      // Coaches are automatically MID players, so they can't bid on MID position
      if (playerPosition === 'MID') {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Coaches cannot bid on MID players as they are the team\'s MID player'
        }));
        return;
      }

      // Check if coach already has a player in this position
      const Player = require('../models/Player');
      const existingPlayerInPosition = await Player.findOne({ 
        buyer: coach._id, 
        position: playerPosition 
      });

      if (existingPlayerInPosition) {
        console.log(`${bidder} already has ${existingPlayerInPosition.name} in ${playerPosition} position`);
        ws.send(JSON.stringify({
          type: 'error',
          message: `You already have a ${playerPosition} player: ${existingPlayerInPosition.name}`
        }));
        return;
      }

      console.log(`Position check passed for ${bidder}: can bid on ${playerPosition}`);

    } catch (error) {
      console.error('Error checking coach points and position:', error);
      return;
    }

    console.log(`Bid placed: ${bidder} bids ${amount} for ${this.auctionState.currentPlayer.name}`);

    // Update auction state
    this.auctionState.currentBid = amount;
    this.auctionState.highestBidder = bidder;

    // Reset timer to 10 seconds on every bid
    this.auctionState.timeRemaining = 10;

    // Broadcast bid update to all coaches
    this.broadcastToAll({
      type: 'bid_placed',
      amount: amount,
      bidder: bidder,
      playerId: playerId,
      timeRemaining: this.auctionState.timeRemaining,
      auctionState: this.auctionState
    });
  }

  async handleEndAuction(ws, data) {
    if (!this.auctionState.isActive) {
      return;
    }

    console.log('===== ENDING AUCTION =====');
    console.log('Ending auction for player:', this.auctionState.currentPlayer?.name);
    console.log('Highest bidder:', this.auctionState.highestBidder);
    console.log('Final bid amount:', this.auctionState.currentBid);

    // Stop the timer
    this.stopAuctionTimer();

    const soldPrice = this.auctionState.currentBid;
    const winner = this.auctionState.highestBidder;
    const playerId = this.auctionState.currentPlayer?._id;

    if (winner && soldPrice > 0 && playerId) {
      try {
        console.log(`Processing sale: ${this.auctionState.currentPlayer.name} to ${winner} for ${soldPrice} points`);
        
        // Find the winning coach
        const coach = await Coach.findOne({ username: winner });
        if (!coach) {
          console.error(`Coach with username '${winner}' not found`);
          throw new Error(`Coach ${winner} not found`);
        }

        console.log(`Found coach: ${coach.name}, current points: ${coach.points}`);
        
        // Get the coach's full name for the frontend roster
        const coachFullName = coach.name;

        // Check if coach has enough points (should already be checked during bidding, but double-check)
        if (coach.points < soldPrice) {
          console.error(`Coach ${winner} has insufficient points: ${coach.points} < ${soldPrice}`);
          throw new Error(`Insufficient points for ${winner}`);
        }

        // Update player in database - assign the winning coach as buyer
        const updatedPlayer = await Player.findByIdAndUpdate(playerId, {
          buyer: coach._id, // Store coach ObjectId as buyer
          currentPrice: soldPrice
        }, { new: true });

        if (!updatedPlayer) {
          console.error(`Player with ID ${playerId} not found`);
          throw new Error(`Player not found`);
        }

        // Deduct points from coach
        coach.points -= soldPrice;
        await coach.save();

        console.log(`✅ SALE COMPLETED:`);
        console.log(`  - Player: ${this.auctionState.currentPlayer.name}`);
        console.log(`  - Buyer: ${winner} (${coach.name})`);
        console.log(`  - Price: ${soldPrice} points`);
        console.log(`  - Coach remaining points: ${coach.points}`);

        // Create updated player object with final price for frontend
        const soldPlayer = {
          ...this.auctionState.currentPlayer,
          currentPrice: soldPrice,
          buyer: coach._id
        };

        // Broadcast auction end with coach's full name for roster updates
        this.broadcastToAll({
          type: 'player_sold',
          player: soldPlayer, // Send updated player with correct price
          winner: coachFullName, // Use full name for frontend roster
          winnerUsername: winner, // Keep username for point refresh logic
          finalPrice: soldPrice,
          auctionState: this.auctionState
        });

      } catch (error) {
        console.error('❌ ERROR updating auction result:', error);
        console.error('Error details:', error.message);
        
        // Broadcast error to admin
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to complete sale: ${error.message}`
          }));
        }
        return; // Exit early if there's an error
      }
    } else {
      console.log('No sale - either no bidder, no bid amount, or no player');
      console.log(`Winner: ${winner}, Price: ${soldPrice}, PlayerId: ${playerId}`);
      
      // Broadcast auction end even if no sale
      this.broadcastToAll({
        type: 'player_sold',
        player: this.auctionState.currentPlayer,
        winner: null,
        winnerUsername: null,
        finalPrice: 0,
        auctionState: this.auctionState
      });
    }

    // Reset auction state after a delay
    setTimeout(() => {
      console.log('Resetting auction state');
      this.auctionState.currentPlayer = null;
      this.auctionState.currentBid = 0;
      this.auctionState.highestBidder = null;
      this.auctionState.timeRemaining = 10;
      this.auctionState.isActive = false;
    }, 3000);
    
    console.log('===== AUCTION END COMPLETE =====');
  }

  startAuctionTimer() {
    console.log('===== TIMER START DEBUG =====');
    console.log('Current timeRemaining before start:', this.auctionState.timeRemaining);
    console.log('Existing timer state:', this.auctionTimer ? 'EXISTS' : 'NULL');
    this.stopAuctionTimer(); // Clear any existing timer
    console.log('Starting new timer with timeRemaining:', this.auctionState.timeRemaining);

    this.auctionTimer = setInterval(() => {
      this.auctionState.timeRemaining--;
      console.log(`Timer tick: ${this.auctionState.timeRemaining} seconds remaining`);

      // Broadcast timer update
      this.broadcastToAll({
        type: 'timer_update',
        timeRemaining: this.auctionState.timeRemaining
      });

      // End auction when time runs out
      if (this.auctionState.timeRemaining <= 0) {
        console.log('Timer reached 0, ending auction');
        this.handleEndAuction(null, { playerId: this.auctionState.currentPlayer?._id });
      }
    }, 1000);
    console.log('Timer started successfully');
    console.log('============================');
  }

  stopAuctionTimer() {
    console.log('===== TIMER STOP DEBUG =====');
    console.log('Stopping timer, current state:', this.auctionTimer ? 'EXISTS' : 'NULL');
    if (this.auctionTimer) {
      clearInterval(this.auctionTimer);
      this.auctionTimer = null;
      console.log('Timer stopped and cleared');
    } else {
      console.log('No timer to stop');
    }
    console.log('============================');
  }

  async broadcastConnectedCoaches() {
    // Filter out admin users from the coaches list
    console.log('All connected users before filtering:', Array.from(this.connectedCoaches.values()).map(info => `${info.coachName} (${info.username || 'no username'}) - ${info.userType || 'unknown type'} - isAdmin: ${info.isAdmin}`));
    
    const coachInfos = [];
    const connectedCoachData = Array.from(this.connectedCoaches.values())
      .filter(info => {
        const isAdmin = info.userType === 'admin' || info.isAdmin === true || info.username === 'admin';
        console.log(`Checking user ${info.coachName} with username '${info.username}', type '${info.userType}', isAdmin flag: ${info.isAdmin}: ${isAdmin ? 'ADMIN - FILTERED OUT' : 'COACH - INCLUDED'}`);
        return !isAdmin;
      });

    // Fetch coach points for each connected coach
    for (const info of connectedCoachData) {
      try {
        const coach = await Coach.findOne({ username: info.username });
        if (coach) {
          coachInfos.push({
            name: info.coachName,
            username: info.username,
            points: coach.points,
            isConnected: true,
            connectedAt: info.joinedAt
          });
        } else {
          console.log(`Warning: Could not find coach data for ${info.username}`);
          coachInfos.push({
            name: info.coachName,
            username: info.username,
            points: 0,
            isConnected: true,
            connectedAt: info.joinedAt
          });
        }
      } catch (error) {
        console.error(`Error fetching points for coach ${info.username}:`, error);
        coachInfos.push({
          name: info.coachName,
          username: info.username,
          points: 0,
          isConnected: true,
          connectedAt: info.joinedAt
        });
      }
    }

    // Get all coaches from database to show disconnected ones too
    try {
      const allCoaches = await Coach.find({});
      allCoaches.forEach(coach => {
        const coachFullName = coach.name;
        const alreadyIncluded = coachInfos.find(info => info.username === coach.username);
        
        if (!alreadyIncluded) {
          // This coach is not connected
          coachInfos.push({
            name: coachFullName,
            username: coach.username,
            points: coach.points,
            isConnected: false,
            connectedAt: null
          });
        } else {
          // Update the name to match database format (in case there are trailing spaces)
          const connectedCoachIndex = coachInfos.findIndex(info => info.username === coach.username);
          if (connectedCoachIndex !== -1) {
            coachInfos[connectedCoachIndex].name = coachFullName;
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all coaches:', error);
    }
    
    console.log('Coach infos with connection status:', coachInfos);
    console.log('Broadcasting coach list (excluding admin):', coachInfos.map(coach => `${coach.name} (${coach.points} pts) - ${coach.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`).join(', '));
    
    const message = JSON.stringify({
      type: 'coaches_update',
      coaches: coachInfos.filter(info => info.isConnected).map(info => info.name), // Keep backward compatibility
      coachDetails: coachInfos.filter(info => info.isConnected), // Only connected coaches for points
      allCoachesStatus: coachInfos, // All coaches with connection status for admin
      count: coachInfos.filter(info => info.isConnected).length
    });

    console.log('Broadcasting message with allCoachesStatus:', JSON.stringify({
      type: 'coaches_update',
      allCoachesStatus: coachInfos
    }, null, 2));

    // Send to all connected users (including admin for display purposes)
    console.log(`Sending coaches_update to ${this.connectedCoaches.size} connected users:`);
    this.connectedCoaches.forEach((userInfo) => {
      if (userInfo.ws.readyState === WebSocket.OPEN) {
        console.log(`  → Sending to: ${userInfo.coachName} (${userInfo.isAdmin ? 'ADMIN' : 'COACH'})`);
        userInfo.ws.send(message);
      } else {
        console.log(`  ✗ Skipping ${userInfo.coachName} - connection not open`);
      }
    });

    const connectedCoachNames = coachInfos.filter(info => info.isConnected).map(info => `${info.name} (${info.points} pts)`);
    console.log(`Broadcasting coach list (excluding admin): ${connectedCoachNames.join(', ')}`);
  }

  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    console.log(`Broadcasting to ${this.connectedCoaches.size} coaches:`, message.type);
    
    this.connectedCoaches.forEach((coachInfo, ws) => {
      if (coachInfo.ws.readyState === WebSocket.OPEN) {
        console.log(`Sending ${message.type} to coach: ${coachInfo.coachName}`);
        coachInfo.ws.send(messageStr);
      } else {
        console.log(`Skipping coach ${coachInfo.coachName} - connection not open`);
      }
    });
  }

  getConnectedCoachesCount() {
    return this.connectedCoaches.size;
  }

  getConnectedCoaches() {
    return Array.from(this.connectedCoaches.values()).map(info => ({
      coachId: info.coachId,
      coachName: info.coachName,
      joinedAt: info.joinedAt
    }));
  }
}

module.exports = AuctionWebSocketServer;
