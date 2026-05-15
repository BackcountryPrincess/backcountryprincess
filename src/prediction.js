import { detectWarmStreaks } from './weather.js';

export function predictionForWeather(days = []) {
  const sorted = days.slice().sort((a, b) => String(a.observation_date).localeCompare(String(b.observation_date)));
  const latest = sorted[sorted.length - 1] || null;
  const recent = sorted.slice(-7);
  const freezeThawDays = recent.filter((day) => Boolean(day.freeze_thaw)).length;
  const tooWarmDays = recent.filter((day) => Number(day.temp_max) >= 12 || Number(day.temp_min) > 0).length;
  const warmStreaks = detectWarmStreaks(sorted);
  const lastWarmStreak = warmStreaks[warmStreaks.length - 1] || null;
  const averageSapScore = recent.length
    ? recent.reduce((sum, day) => sum + Number(day.sap_score || 0), 0) / recent.length
    : 0;

  const confidence = Math.max(0, Math.min(100, Math.round(
    averageSapScore + freezeThawDays * 6 - tooWarmDays * 12 - (lastWarmStreak && lastWarmStreak.days >= 4 ? 20 : 0)
  )));

  return {
    latestDate: latest ? latest.observation_date : null,
    freezeThawDays,
    warmStreaks,
    tooWarmDays,
    sapConfidence: confidence,
    sapStatus: confidence >= 60 ? 'sap-likely' : confidence >= 35 ? 'marginal' : 'no-sap',
    seasonEndingWarning: Boolean((lastWarmStreak && lastWarmStreak.days >= 3) || tooWarmDays >= 3),
    reasons: [
      `${freezeThawDays} freeze/thaw days in the latest 7-day window`,
      `${tooWarmDays} too-warm days in the latest 7-day window`,
      lastWarmStreak ? `Warm streak from ${lastWarmStreak.startDate} to ${lastWarmStreak.endDate}` : 'No warm streak detected'
    ]
  };
}
