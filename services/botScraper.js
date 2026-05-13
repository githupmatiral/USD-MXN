const puppeteer = require('puppeteer');

class BotScraper {
  constructor() {
    this.browser = null;
    this.botUrl = process.env.BOT_URL || 'https://the-official-bot-production.up.railway.app/';
    this.timeOffset = parseInt(process.env.TIME_OFFSET || '6'); // محفوظ لكن غير مستخدم في التحويل
  }

  async initBrowser() {
    if (this.browser) return;

    console.log('Launching browser...');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });

    console.log('Browser launched successfully');
  }

  async scrapeSignals(orderType = 'PUT') {
    try {
      await this.initBrowser();

      console.log(`Scraping ${orderType} signals...`);

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      await page.goto(this.botUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await page.select('#cbAtivo', 'USD_MXN');
      await page.evaluate(() => {
        const select = document.querySelector('#cbAtivo');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await this.sleep(1000);

      await page.select('#selPercentageMin', '100');
      await this.sleep(500);

      await page.select('#selPercentageMax', '100');
      await this.sleep(500);

      await page.select('#selCandleTime', 'M1');
      await this.sleep(500);

      await page.select('#selDays', '20');
      await this.sleep(500);

      await page.select('#selOrderType', orderType);
      await this.sleep(500);

      await page.evaluate(() => {
        listBestPairTimes = [];
        getHistoric();
      });

      await page.waitForFunction(
        () => typeof listBestPairTimes !== 'undefined' && listBestPairTimes.length > 0,
        { timeout: 90000 }
      );

      // 🚨 IMPORTANT: NO TIME CONVERSION HERE
      const signals = await page.evaluate((type) => {
        return listBestPairTimes.map(signal => {
          const timeParts = signal.time.split(':');

          const hour = parseInt(timeParts[0]);
          const minute = parseInt(timeParts[1]);
          const second = parseInt(timeParts[2] || 0);

          return {
            pair: 'USD/MXN',
            hour,
            minute,
            second,
            time: `${hour.toString().padStart(2, '0')}:${minute
              .toString()
              .padStart(2, '0')}:${second
              .toString()
              .padStart(2, '0')}`,
            type,
            winrate: signal.winrate || 100
          };
        });
      }, orderType);

      await page.close();

      return signals;

    } catch (error) {
      console.error('Error scraping signals:', error);
      throw error;
    }
  }

  async getAllSignals() {
    try {
      const putSignals = await this.scrapeSignals('PUT');
      await this.sleep(2000);
      const callSignals = await this.scrapeSignals('CALL');

      return {
        PUT: putSignals,
        CALL: callSignals,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting signals:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BotScraper();
