const botScraper = require('./botScraper');
const timezoneConverter = require('./timezoneConverter');

class SignalAnalyzer {
  constructor() {
    this.cache = {
      PUT:  { signals: [], fetchedAt: null },
      CALL: { signals: [], fetchedAt: null }
    };
    this.isRefreshing = false;
    this.CACHE_DURATION = 3 * 60 * 60 * 1000;
  }

  isCacheValid(type) {
    const c = this.cache[type];
    return c.fetchedAt && c.signals.length > 0 &&
      (Date.now() - c.fetchedAt) < this.CACHE_DURATION;
  }

  isCacheReady() {
    return this.isCacheValid('PUT') && this.isCacheValid('CALL');
  }

  async generateSignals(type) {
    if (this.isCacheValid(type)) {
      console.log(`✅ Using cached ${type}`);
      return this.cache[type].signals;
    }

    console.log(`🔄 Fetching ${type} signals...`);

    try {
      const signals = await botScraper.scrapeSignals(type);

      this.cache[type] = {
        signals: signals.map(s => ({ ...s, pairDisplay: 'USD/MXN' })),
        fetchedAt: Date.now()
      };

      const bot = timezoneConverter.getCurrentBotTime();
      console.log(`📊 MXN ${type}: ${signals.length} signals | Bot time (UTC+6): ${String(bot.hour).padStart(2,'0')}:${String(bot.minute).padStart(2,'0')}:${String(bot.second).padStart(2,'0')}`);

      // Debug: show how many are upcoming
      const upcoming = signals.filter(s => {
        const [h, m, sec] = s.time.split(':').map(Number);
        const sigSecs = h * 3600 + m * 60 + sec;
        return sigSecs > bot.totalSeconds;
      });
      console.log(`📅 ${type} upcoming (after now): ${upcoming.length}`);
      if (upcoming.length > 0) {
        console.log(`   First: ${upcoming[0].time} | Last: ${upcoming[upcoming.length-1].time}`);
      }

      return this.cache[type].signals;

    } catch (err) {
      console.error(`❌ Error ${type}:`, err.message);
      return [];
    }
  }

  async refreshAll() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    await this.generateSignals('PUT');
    await new Promise(r => setTimeout(r, 1000));
    await this.generateSignals('CALL');

    // Show next upcoming signal
    const all = this.getAllMergedSignals();
    const bot = timezoneConverter.getCurrentBotTime();
    console.log(`🔍 Total merged: ${all.length} | Bot now: ${String(bot.hour).padStart(2,'0')}:${String(bot.minute).padStart(2,'0')}`);

    const upcoming = timezoneConverter.findNextSignal(all, 2);
    console.log(`🔍 After filter: ${upcoming.length} upcoming`);

    if (upcoming.length > 0) {
      const next = upcoming[0];
      console.log(`🎯 NEXT SIGNAL: ${next.type} @ ${next.localTime} (${next.minutesUntil}min)`);
    } else {
      console.log(`⚠️ No upcoming signals - all passed for today`);
    }

    this.isRefreshing = false;
  }

  startBackgroundRefresh() {
    setTimeout(() => this.refreshAll(), 5000);
    setInterval(() => this.refreshAll(), this.CACHE_DURATION);
  }

  getAllMergedSignals() {
    return [
      ...this.cache.PUT.signals,
      ...this.cache.CALL.signals
    ];
  }

  clearCache() {
    this.cache.PUT  = { signals: [], fetchedAt: null };
    this.cache.CALL = { signals: [], fetchedAt: null };
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new SignalAnalyzer();
