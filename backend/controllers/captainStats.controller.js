// src/controllers/captainStats.controller.js
const captainModel = require('../models/captain.model');

/**
 * GET /captains/stats
 * Protected: authCaptain should set req.captain
 */
module.exports.getCaptainStats = async (req, res) => {
  try {
    if (!req.captain || !req.captain._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ fetch captain stats from DB
    const captain = await captainModel.findById(req.captain._id).select('stats');

    if (!captain) {
      return res.status(404).json({ message: 'Captain not found' });
    }

    return res.status(200).json(captain.stats);
  } catch (err) {
    console.error('getCaptainStats error:', err);
    return res.status(500).json({ message: err.message || 'Failed to get stats' });
  }
};
