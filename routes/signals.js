const express = require('express');
const router = express.Router();
const signalsController = require('../controllers/signalsController');

// 🔥 Core routes (أساسية)
router.post('/mxn', signalsController.generateMXNSignals);
router.post('/get', signalsController.generateMXNSignals);
router.get('/upcoming', signalsController.getUpcomingSignals);
router.post('/clear-cache', signalsController.clearCache);

// 🚀 Optional routes (فقط لو موجودة في controller)
if (typeof signalsController.getCacheStatus === 'function') {
  router.get('/status', signalsController.getCacheStatus);
}

if (typeof signalsController.forceRefresh === 'function') {
  router.post('/refresh', signalsController.forceRefresh);
}

module.exports = router;
