class TimezoneConverter {

  // 🔹 عرض وقت البوت (UTC+6 فقط للعرض)
  getCurrentBotTime() {
    const now = new Date();

    const hour = (now.getUTCHours() + 6) % 24;
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();

    return {
      hour,
      minute,
      second,
      totalSeconds: hour * 3600 + minute * 60 + second
    };
  }

  /**
   * 🔹 تحويل الوقت من وقت البوت إلى وقت المستخدم
   * botOffset = 6 (ثابت البوت)
   * userOffset = توقيت المستخدم
   */
  convertToUserTime(signalTime, userOffset, botOffset = 6) {
    const [h, m, s] = signalTime.split(':').map(Number);

    const userHour = (h - botOffset + userOffset + 24) % 24;

    return {
      hour: userHour,
      minute: m,
      second: s,
      localTime: `${String(userHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    };
  }

  /**
   * 🔹 فلترة الإشارات القادمة فقط
   */
  findNextSignal(signals, userOffset) {
    const bot = this.getCurrentBotTime();

    const upcoming = [];

    for (const signal of signals) {
      const [h, m, s] = signal.time.split(':').map(Number);

      const signalSeconds = h * 3600 + m * 60 + s;
      const secondsUntil = signalSeconds - bot.totalSeconds;

      // ❌ تجاهل الماضي
      if (secondsUntil <= 0) continue;

      const converted = this.convertToUserTime(signal.time, userOffset);

      upcoming.push({
        ...signal,
        localTime: converted.localTime,
        localHour: converted.hour,
        localMinute: converted.minute,
        localSecond: converted.second,
        secondsUntil,
        minutesUntil: Math.floor(secondsUntil / 60),
        hoursUntil: Math.floor(secondsUntil / 3600)
      });
    }

    return upcoming.sort((a, b) => a.secondsUntil - b.secondsUntil);
  }

  /**
   * 🔹 تنسيق العد التنازلي
   */
  formatCountdown(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const pad = n => String(n).padStart(2, '0');

    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
}

module.exports = new TimezoneConverter();
