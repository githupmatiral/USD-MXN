const signalAnalyzer = require('../services/signalAnalyzer');
const timezoneConverter = require('../services/timezoneConverter');

/**
 * POST /api/signals/mxn
 */
exports.generateMXNSignals = async (req, res) => {
  try {
    const { uid, deviceId, timezone } = req.body;

    if (!uid || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing uid or deviceId'
      });
    }

    const userTimezone = timezone ? parseInt(timezone) : 2;

    const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), ms)
        )
      ]);
    };

    await withTimeout(signalAnalyzer.generateSignals('PUT'), 120000);
    await withTimeout(signalAnalyzer.generateSignals('CALL'), 120000);

    const allSignals = signalAnalyzer.getAllMergedSignals();

    if (!allSignals.length) {
      return res.json({
        success: false,
        message: 'No signals available'
      });
    }

    // 🔥 ONLY ONE CONVERSION HERE
    const upcoming = timezoneConverter.findNextSignal(
      allSignals,
      userTimezone
    );

    if (!upcoming.length) {
      return res.json({
        success: false,
        message: 'No valid signals'
      });
    }

    const nextSignal = upcoming[0];

    res.json({
      success: true,
      nextSignal: {
        pair: nextSignal.pair || 'USD/MXN',
        type: nextSignal.type,
        time: nextSignal.localTime,
        originalTime: nextSignal.time,
        secondsUntil: nextSignal.secondsUntil,
        minutesUntil: nextSignal.minutesUntil,
        countdown: timezoneConverter.formatCountdown(nextSignal.secondsUntil)
      },
      recommendedType: nextSignal.type,
      upcomingSignals: upcoming.slice(0, 10),
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

/**
 * GET /api/signals/upcoming
 */
exports.getUpcomingSignals = async (req, res) => {
  try {
    const userTimezone = req.query.timezone
      ? parseInt(req.query.timezone)
      : 2;

    await signalAnalyzer.generateSignals('PUT');
    await signalAnalyzer.generateSignals('CALL');

    const allSignals = signalAnalyzer.getAllMergedSignals();

    const upcoming = timezoneConverter.findNextSignal(
      allSignals,
      userTimezone
    );

    res.json({
      success: true,
      signals: upcoming.slice(0, 20),
      count: upcoming.length,
      userTimezone,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to get signals',
      error: err.message
    });
  }
};

/**
 * POST /api/signals/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    signalAnalyzer.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cache'
    });
  }
};
