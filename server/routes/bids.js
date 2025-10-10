const express = require('express');
const { body, validationResult } = require('express-validator');
const bidController = require('../controllers/bidController');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateBid = [
  body('playerId').isMongoId().withMessage('Valid player ID is required')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Routes
router.post('/', auth, validateBid, handleValidationErrors, bidController.createBid);
router.get('/player/:playerId', bidController.getBidsByPlayer);
router.get('/user', auth, bidController.getBidsByUser);
router.get('/', bidController.getAllBids);
router.post('/buy', auth, bidController.buyPlayer);

module.exports = router;
