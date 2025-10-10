const express = require('express');
const { body, validationResult } = require('express-validator');
const playerController = require('../controllers/playerController');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validatePlayer = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('description').isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters')
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
router.get('/', playerController.getAllPlayers);
router.get('/:id', playerController.getPlayerById);
router.post('/', validatePlayer, handleValidationErrors, playerController.createPlayer);
router.post('/import', auth, playerController.importPlayers);
router.put('/:id', auth, playerController.updatePlayer);
router.delete('/:id', auth, playerController.deletePlayer);

module.exports = router;
